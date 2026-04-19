import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('--- Checking Supabase profiles table ---');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (profileError) {
    console.error('Error fetching profiles:', profileError);
  } else {
    console.log('Profiles columns:', profiles.length > 0 ? Object.keys(profiles[0]) : 'Empty table');
  }

  console.log('\n--- Checking Supabase otp_verifications table ---');
  const { data: otps, error: otpError } = await supabase
    .from('otp_verifications')
    .select('*')
    .limit(1);
  
  if (otpError) {
    console.error('Error fetching otp_verifications:', otpError);
  } else {
    console.log('OTP columns:', otps.length > 0 ? Object.keys(otps[0]) : 'Empty table');
  }
}

checkSchema();
