// /public/js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://bxwhobiazcaijsyxcogv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4d2hvYmlhemNhaWpzeXhjb2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MDQ4ODEsImV4cCI6MjA2MDQ4MDg4MX0.ed7whMpzl7YQxpNFl_c65bK6oCGWRzgVdUuthtlqOmw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
