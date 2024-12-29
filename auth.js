import { createClient } from '@supabase/supabase-js';
import config from './config.js';

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

export const auth = {
    async signUp(email, password) {
        const { user, error } = await supabase.auth.signUp({
            email,
            password
        });
        return { user, error };
    },

    async signIn(email, password) {
        const { user, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { user, error };
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
};

export const db = {
    async saveMission(userId, missionData) {
        const { data, error } = await supabase
            .from('missions')
            .insert([
                { user_id: userId, ...missionData }
            ]);
        return { data, error };
    },

    async getUserMissions(userId) {
        const { data, error } = await supabase
            .from('missions')
            .select('*')
            .eq('user_id', userId);
        return { data, error };
    }
}; 