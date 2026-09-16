import { supabase } from './api/_supabase.js';

async function cleanLogs() {
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return;
  }

  console.log('Fetching mail logs...');
  
  const { data, error } = await supabase
    .from('mail_logs')
    .select('id, recipient_name, recipient');

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  const toDelete = data.filter(log => 
    !log.recipient || 
    log.recipient.trim() === '' || 
    log.recipient.trim() === '-' || 
    !log.recipient_name || 
    log.recipient_name === 'Unknown'
  );

  console.log(`Found ${toDelete.length} broken logs to delete.`);

  if (toDelete.length > 0) {
    const idsToDelete = toDelete.map(l => l.id);
    const { error: deleteError } = await supabase
      .from('mail_logs')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting logs:', deleteError);
    } else {
      console.log('Successfully deleted broken logs!');
    }
  } else {
    console.log('No logs matched the criteria.');
  }
}

cleanLogs();
