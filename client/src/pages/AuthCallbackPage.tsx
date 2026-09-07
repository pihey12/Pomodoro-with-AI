import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      // Supabase parses the URL hash / query for the session
      const { error } = await supabase.auth.getSession();
      if (!cancelled) {
        navigate(error ? "/login" : "/", { replace: true });
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="center-page">
      <p className="muted">Finishing sign-in…</p>
    </div>
  );
}
