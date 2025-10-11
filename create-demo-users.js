// create-demo-users.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createDemoUsers() {
  console.log('Attempting to create demo users...');

  // --- Job Seeker User ---
  const jobSeekerEmail = 'jobseeker@example.com';
  const jobSeekerPassword = 'password123';
  const jobSeekerFullName = 'Job Seeker Demo';

  console.log(`Creating job seeker: ${jobSeekerEmail}`);
  try {
    const { data: jobSeekerData, error: jobSeekerError } = await supabase.auth.signUp({
      email: jobSeekerEmail,
      password: jobSeekerPassword,
      options: {
        data: {
          full_name: jobSeekerFullName,
          user_type: 'job_seeker',
        },
      },
    });

    if (jobSeekerError) {
      console.error(`Error creating job seeker ${jobSeekerEmail}:`, jobSeekerError.message);
    } else {
      console.log(`Successfully created job seeker: ${jobSeekerEmail}`);
      console.log('Job Seeker User ID:', jobSeekerData.user?.id);
      if (jobSeekerData.user && !jobSeekerData.user.confirmed_at) {
        console.log(`Please confirm job seeker email: ${jobSeekerEmail} in your Supabase dashboard.`);
      }
    }
  } catch (e) {
    console.error(`Unexpected error creating job seeker ${jobSeekerEmail}:`, e.message);
  }

  console.log('\n---');

  // --- Company User ---
  const companyEmail = 'company@example.com';
  const companyPassword = 'password123';
  const companyFullName = 'Company Demo';

  console.log(`Creating company user: ${companyEmail}`);
  try {
    const { data: companyData, error: companyError } = await supabase.auth.signUp({
      email: companyEmail,
      password: companyPassword,
      options: {
        data: {
          full_name: companyFullName,
          user_type: 'company',
        },
      },
    });

    if (companyError) {
      console.error(`Error creating company user ${companyEmail}:`, companyError.message);
    } else {
      console.log(`Successfully created company user: ${companyEmail}`);
      console.log('Company User ID:', companyData.user?.id);
      if (companyData.user && !companyData.user.confirmed_at) {
        console.log(`Please confirm company user email: ${companyEmail} in your Supabase dashboard.`);
      }
    }
  } catch (e) {
    console.error(`Unexpected error creating company user ${companyEmail}:`, e.message);
  }

  console.log('\nDemo user creation process finished.');
}

createDemoUsers();
