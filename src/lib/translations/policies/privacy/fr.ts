import type { PolicyContent } from '../types'

export const content: PolicyContent = {
  title: 'Politique de confidentialité',
  updatedLabel: 'Dernière mise à jour : novembre 2026',
  aiTranslatedLabel: 'Traduit par IA — dernière révision : novembre 2026',
  viewInEnglishLabel: 'Ceci est une traduction fournie par commodité. La version anglaise est le document juridiquement contraignant.',
  viewInEnglishLinkText: 'Voir en anglais',
  intro: [
    "VozIt! (« VozIt », « nous ») exploite une plateforme de journalisme citoyen où les reporters capturent et partagent des vidéos de témoins oculaires, et où les spectateurs lisent, regardent et soutiennent ce journalisme. Cette politique explique quelles informations nous collectons, pourquoi nous les collectons et comment elles sont utilisées, y compris pour la publicité qui aide à financer VozIt et à rémunérer les reporters.",
  ],
  sections: [
    {
      heading: 'Informations que nous collectons',
      paragraphs: [
        { label: 'Informations de compte.', text: "Adresse e-mail, nom d'utilisateur, nom d'affichage et mot de passe (stocké en toute sécurité, jamais en texte brut) lors de votre inscription. Si vous vous connectez avec Google ou Facebook, nous recevons à la place votre nom, votre e-mail et votre photo de profil depuis ce fournisseur." },
        { label: 'Contenu du rapport et données de vérification.', text: "Lorsque vous soumettez un rapport, nous collectons la vidéo elle-même ainsi que la localisation (coordonnées GPS), l'orientation de l'appareil (cap de la boussole et inclinaison), l'altitude et le fuseau horaire, lus directement depuis les propres capteurs de votre appareil au moment de la capture. Ces données de « vérité terrain » sont essentielles à la manière dont VozIt vérifie qu'un rapport a réellement été filmé où et quand il le prétend, et sont affichées aux côtés des rapports publiés dans le cadre de leurs signaux de crédibilité." },
        { label: 'Informations de paiement.', text: "Si vous recevez des paiements ou effectuez un paiement (par exemple en licenciant un rapport), les détails de paiement sont collectés et traités par nos partenaires de paiement (dont Stripe et nos prestataires de paiement). VozIt ne stocke pas vos numéros de carte ou de compte bancaire complets sur ses propres serveurs." },
        { label: "Informations d'utilisation et d'appareil.", text: 'Adresse IP, type de navigateur/appareil et données techniques similaires, utilisées pour la sécurité (par exemple, la détection de schémas de vote frauduleux) et pour garantir la fiabilité du service.' },
        { label: 'Cookies.', text: 'Nous utilisons des cookies pour vous garder connecté et mémoriser vos préférences. Si la publicité est active sur VozIt, Google et ses partenaires publicitaires peuvent également utiliser des cookies et technologies similaires pour diffuser et mesurer les annonces ; voir « Publicité » ci-dessous.' },
      ],
    },
    {
      heading: 'Comment nous utilisons les informations',
      list: [
        'Pour faire fonctionner la plateforme : publier des rapports, traiter les paiements et vous montrer du contenu pertinent',
        "Pour vérifier l'authenticité des rapports à l'aide de données de localisation et de capteurs issues de l'appareil",
        'Pour modérer le contenu pour la sécurité et la conformité légale avant publication',
        'Pour détecter et prévenir la fraude, y compris les faux comptes et les votes manipulés',
        'Pour communiquer avec vous : vérification de compte, réinitialisation de mot de passe et mises à jour du service',
        'Pour nous conformer aux obligations légales, y compris les sanctions et le contrôle de conformité des paiements lors des retraits',
      ],
    },
    {
      heading: 'Publicité',
      paragraphs: [
        "VozIt utilise Google AdSense pour afficher des publicités qui aident à financer la plateforme et à verser aux reporters leur part des revenus. Google et ses partenaires utilisent des cookies pour diffuser des publicités basées sur vos visites sur VozIt et d'autres sites, et pour mesurer leur performance. Vous pouvez en savoir plus sur la façon dont Google utilise ces données, et contrôler vos paramètres de personnalisation des annonces, via la politique des sites partenaires de Google et les paramètres des annonces Google (liés depuis la version anglaise de cette page). Si vous êtes dans l'Espace économique européen, un consentement supplémentaire est requis avant l'affichage de publicités personnalisées ; sans celui-ci, vous verrez des publicités non personnalisées à la place.",
      ],
    },
    {
      heading: 'Avec qui nous partageons des informations',
      paragraphs: [
        'Nous partageons des informations avec les prestataires de services qui font fonctionner VozIt, chacun uniquement dans le but de fournir son service spécifique :',
      ],
      list: [
        'Supabase — données de compte, données de rapport et authentification',
        'Mux — hébergement, diffusion et traitement vidéo',
        'Stripe et nos prestataires de paiement — paiements et rémunérations des reporters',
        'Hive — modération automatisée du contenu',
        "Anthropic (Claude) — analyse le texte du rapport pour le résumé des 5W affiché avec chaque rapport, et traduit le contenu des rapports et les soumissions par chat entre les langues. Anthropic traite ce texte pour exécuter ces fonctions et ne l'utilise pas pour entraîner ses modèles.",
        'Resend — e-mails transactionnels (vérification de compte, réinitialisation de mot de passe)',
        'Google (AdSense) — publicité, comme décrit ci-dessus',
        "Telegram — si vous soumettez un rapport en discutant avec le bot Telegram de VozIt plutôt que via le site web, Telegram transmet cette conversation (y compris votre vidéo et toute localisation que vous partagez) à nos serveurs de la même manière qu'il transmet tout autre message que vous envoyez sur sa plateforme",
      ],
    },
    {
      heading: 'Les rapports publiés sont publics',
      paragraphs: [
        "Les rapports publiés, y compris leur titre, leur description, leur vidéo et leur localisation, sont publics par conception : c'est tout l'intérêt du journalisme citoyen. Nous ne vendons pas vos informations de compte personnelles (e-mail, mot de passe, détails de paiement) à des tiers.",
      ],
    },
    {
      heading: 'Vos choix',
      paragraphs: [
        "Vous pouvez mettre à jour les informations de votre compte depuis les Paramètres à tout moment. Vous pouvez supprimer votre propre compte à tout moment depuis les Paramètres, ou en nous contactant à l'adresse e-mail ci-dessous. Notez que les rapports publiés peuvent rester disponibles dans le cadre des archives publiques, de la même manière que fonctionnent les archives journalistiques, même après la suppression d'un compte.",
      ],
    },
    {
      heading: 'Confidentialité des enfants',
      paragraphs: [
        "VozIt ne s'adresse pas aux enfants de moins de 13 ans, et vous devez avoir au moins 13 ans pour créer un compte, conformément à la loi américaine sur la protection de la vie privée des enfants en ligne (COPPA) et à des lois similaires ailleurs. Nous ne collectons pas sciemment d'informations personnelles auprès de quiconque de moins de 13 ans. Si nous apprenons que nous avons collecté des informations auprès d'un enfant de moins de 13 ans sans le consentement d'un parent ou tuteur, nous supprimerons ce compte et ses données. Si vous pensez qu'un enfant a créé un compte ou apparaît dans un rapport, contactez-nous à l'adresse e-mail ci-dessous et nous examinerons rapidement la situation.",
      ],
    },
    {
      heading: 'Modifications de cette politique',
      paragraphs: [
        'Nous pouvons mettre à jour cette politique à mesure que VozIt évolue. Nous mettrons à jour la date de « Dernière mise à jour » ci-dessus lorsque nous le ferons.',
      ],
    },
  ],
  contactLabel: 'Des questions sur cette politique ou vos données ? Écrivez à',
}
