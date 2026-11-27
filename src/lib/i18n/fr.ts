/**
 * French (Suisse romande) dictionary. German and Italian will be added as
 * de.ts / it.ts with the same shape; `Dictionary` enforces it.
 */
export const fr = {
  app: { name: "HandyFlow", tagline: "L'assistant administratif des artisans" },
  nav: {
    dashboard: "Tableau de bord",
    home: "Accueil",
    interventions: "Interventions",
    customers: "Clients",
    settings: "Paramètres",
    newIntervention: "Nouvelle intervention",
    logout: "Se déconnecter",
    profile: "Mon profil",
  },
  common: {
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    back: "Retour",
    search: "Rechercher",
    loading: "Chargement…",
    optional: "facultatif",
    none: "—",
    errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
    saved: "Modifications enregistrées",
  },
  status: {
    intervention: { draft: "Rapport à compléter", completed: "Rapport terminé" },
  },
  validation: {
    required: "Ce champ est obligatoire",
    email: "Adresse e-mail invalide",
    postalCode: "Code postal suisse à 4 chiffres (ex. 1003)",
    phone: "Numéro de téléphone invalide",
    passwordMin: "Au moins 8 caractères",
    passwordMatch: "Les mots de passe ne correspondent pas",
    date: "Date invalide",
    number: "Nombre invalide",
    tooLong: "Texte trop long",
  },
} as const;

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
export type Dictionary = DeepString<typeof fr>;
