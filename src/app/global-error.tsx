"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr-CH">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#f8fafc", color: "#14213d" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 16 }}>
          <h1 style={{ fontSize: 22 }}>Une erreur est survenue</h1>
          <p style={{ color: "#64748b" }}>La page n&apos;a pas pu être chargée. Réessayez dans un instant.</p>
          {error.digest && <p style={{ color: "#94a3b8", fontSize: 12 }}>Référence : {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, border: 0, background: "#14213d", color: "white" }}>Réessayer</button>
          <p><a href="/connexion" style={{ color: "#2563eb", fontSize: 14 }}>Retour à la connexion</a></p>
        </div>
      </body>
    </html>
  );
}
