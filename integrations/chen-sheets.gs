/** Chen Shop customer form receiver. Deploy as Web app: Execute as Me;
 * access Anyone. Set the private script property CHEN_TOKEN in Project Settings.
 */
const SPREADSHEET_ID = '1wbMypUibJJW8c2udwF-bbjKwErqFm74FlwQdr5qYXnY';
function doPost(e) {
 const lock=LockService.getScriptLock();
 try {
  const x=JSON.parse(e.postData.contents);
  const token=PropertiesService.getScriptProperties().getProperty('CHEN_TOKEN');
  if(!token||x.token!==token)return response_({ok:false,error:'unauthorized'});
  if(x.action==='health')return response_({ok:true,spreadsheetId:SPREADSHEET_ID});
  if(!/^[a-f0-9-]{36}$/.test(x.id)||!x.name||!x.phone||x.consent!==true)return response_({ok:false,error:'invalid_input'});
  lock.waitLock(20000);
  const sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetById(0);
  if(!sheet)throw new Error('Target sheet not found');
  const last=sheet.getLastRow();
  if(last>1&&sheet.getRange(2,1,last-1,1).createTextFinder(x.id).matchEntireCell(true).findNext())return response_({ok:true,id:x.id,duplicate:true});
  const time=Utilities.formatDate(new Date(x.createdAt),'Asia/Ho_Chi_Minh','dd/MM/yyyy HH:mm:ss');
  const row=[x.id,time,x.name,x.phone,x.address,x.productName,Number(x.quantity),x.note,x.source,'Mới','Đã đồng ý',x.productId];
  sheet.getRange(last+1,4).setNumberFormat('@');
  sheet.getRange(last+1,1,1,12).setValues([row.map(safeCell_)]);
  SpreadsheetApp.flush();
  return response_({ok:true,id:x.id});
 }catch(error){return response_({ok:false,error:'write_failed'});}
 finally{if(lock.hasLock())lock.releaseLock();}
}
function safeCell_(value){if(typeof value==='number')return value;const text=String(value==null?'':value);return /^[=+\-@]/.test(text)?"'"+text:text;}
function response_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
