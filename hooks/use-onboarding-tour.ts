import { supabase } from '@/supabaseClient';
import { useEffect, useState } from 'react';

export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setShowTour(false);
          setLoading(false);
          return;
        }

        // Check if user has completed the tour in their metadata
        const hasCompletedTour = session.user.user_metadata?.has_completed_tour === true;
        
        // If they haven't completed it, show the tour
        setShowTour(!hasCompletedTour);
        setLoading(false);
      } catch (error) {
        console.error('Error checking tour status:', error);
        setLoading(false);
      }
    };

    checkTourStatus();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if this is a new user (just signed up)
        const hasCompletedTour = session.user.user_metadata?.has_completed_tour === true;
        setShowTour(!hasCompletedTour);
      } else if (event === 'SIGNED_OUT') {
        setShowTour(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const completeTour = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Update user metadata to mark tour as completed
      const { error } = await supabase.auth.updateUser({
        data: {
          has_completed_tour: true,
        },
      });

      if (error) throw error;

      setShowTour(false);
    } catch (error) {
      console.error('Error completing tour:', error);
    }
  };

  return {
    showTour,
    loading,
    completeTour,
  };
}






