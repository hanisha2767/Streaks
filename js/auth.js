// Correct Supabase client (matches your actual project)
const supabaseUrl = 'https://nfyopcyojsgsxbcooqvd.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5meW9wY3lvanNnc3hiY29vcXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODY3NDYsImV4cCI6MjA4MDc2Mjc0Nn0.mOkugQNFKANu3u4towFq2K2jTcCUFds-RJ3R1ejzpZA';

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        username: username || email.split('@')[0],
      });

    if (profileError) throw profileError;
  }

  return data;
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
