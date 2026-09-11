/**
 * =========================================================================
 * RNS MUN '26 - Google Apps Script Email Automation Web App
 * =========================================================================
 * 
 * Instructions for Deployment (using muntechnical@gmail.com):
 * 1. Log in to Google with: muntechnical@gmail.com
 * 2. Go to script.google.com and paste this entire code into Code.gs.
 * 3. Click "Deploy" -> "New deployment".
 * 4. Select Type: "Web app".
 * 5. Set:
 *    - Description: "RNS MUN Mailer"
 *    - Execute as: "Me (muntechnical@gmail.com)"
 *    - Who has access: "Anyone"
 * 6. Click "Deploy", click "Authorize access", and copy the Web App URL.
 * 7. Paste that Web App URL into the RNS MUN Admin Dashboard under the "Mail Templates" tab.
 * 
 * -> All emails will be sent directly from muntechnical@gmail.com with
 *    Sender Name: "RNS MUN Secretariat"
 *    Reply-To: "mun@rnsit.ac.in"
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Wait up to 10 seconds for concurrency lock
    
    var data;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return createJsonResponse({ success: false, error: 'Invalid JSON payload: ' + parseErr.message }, 400);
      }
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      return createJsonResponse({ success: false, error: 'Empty request payload' }, 400);
    }

    var to = (data.recipient || data.to || '').trim();
    var subject = (data.subject || 'Notice from RNS MUN \'26').trim();
    var htmlBody = data.htmlBody || data.body || '<p>No content provided</p>';
    var senderName = data.senderName || 'RNS MUN Secretariat';
    var replyTo = (data.replyTo || 'mun@rnsit.ac.in').trim();

    if (!to || !to.includes('@')) {
      return createJsonResponse({ success: false, error: 'Valid recipient email is required' }, 400);
    }

    // Process file attachments (if any)
    var emailAttachments = [];
    if (data.attachments && Array.isArray(data.attachments)) {
      for (var i = 0; i < data.attachments.length; i++) {
        var att = data.attachments[i];
        if (att && att.base64 && att.name) {
          try {
            // Strip data URI header if present (e.g., "data:image/png;base64,")
            var base64Data = att.base64;
            var mimeType = att.mimeType || 'application/octet-stream';
            
            if (base64Data.indexOf(';base64,') !== -1) {
              var parts = base64Data.split(';base64,');
              mimeType = parts[0].replace('data:', '') || mimeType;
              base64Data = parts[1];
            }
            
            var decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, att.name);
            emailAttachments.push(decodedBlob);
          } catch (attErr) {
            Logger.log('Attachment parsing error for ' + att.name + ': ' + attErr.message);
          }
        }
      }
    }

    // Build Mail Options
    var mailOptions = {
      name: senderName,
      replyTo: replyTo,
      htmlBody: htmlBody
    };

    if (emailAttachments.length > 0) {
      mailOptions.attachments = emailAttachments;
    }

    // Create plain text fallback by stripping HTML tags
    var plainText = htmlBody.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

    // Send email using GmailApp
    GmailApp.sendEmail(to, subject, plainText, mailOptions);

    var senderEmail = 'muntechnical@gmail.com';
    try { senderEmail = Session.getActiveUser().getEmail() || senderEmail; } catch(err){}

    return createJsonResponse({
      success: true,
      message: 'Email successfully sent to ' + to,
      recipient: to,
      sender: senderEmail,
      senderName: senderName,
      replyTo: replyTo,
      subject: subject,
      attachmentCount: emailAttachments.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    Logger.log('Error sending email: ' + error.toString());
    return createJsonResponse({
      success: false,
      error: error.message || error.toString()
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var activeUser = 'unknown';
  try { activeUser = Session.getActiveUser().getEmail(); } catch(err){}
  return createJsonResponse({
    success: true,
    status: 'RNS MUN Google Apps Script Mailer is operational.',
    executingAccount: activeUser,
    senderName: 'RNS MUN Secretariat',
    replyTo: 'mun@rnsit.ac.in',
    version: '1.2.0',
    timestamp: new Date().toISOString()
  });
}

function createJsonResponse(obj, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
