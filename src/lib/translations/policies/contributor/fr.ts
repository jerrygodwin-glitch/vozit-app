import type { PolicyContent } from '../types'

export const content: PolicyContent = {
  title: 'Accord du reporter et du contributeur',
  updatedLabel: 'Dernière mise à jour : novembre 2026',
  aiTranslatedLabel: 'Traduit par IA — dernière révision : novembre 2026',
  viewInEnglishLabel: 'Ceci est une traduction fournie par commodité. La version anglaise est le document juridiquement contraignant.',
  viewInEnglishLinkText: 'Voir en anglais',
  intro: [
    "Ceci régit votre relation avec VozIt en tant que reporter soumettant du contenu, aux côtés des, et non à la place des, Conditions d'utilisation de VozIt. Cela s'applique quelle que soit la façon dont vous soumettez votre contenu : le site web, ou le bot Telegram de VozIt, et tout autre canal de soumission que VozIt ajoutera à l'avenir.",
  ],
  sections: [
    {
      heading: 'Ce que vous certifiez en soumettant un rapport',
      paragraphs: ['En soumettant un rapport, vous certifiez tout ce qui suit :'],
      list: [
        "Vous avez personnellement capturé ces images, au moment et à l'endroit que vous avez indiqués",
        "Les images sont authentiques et non modifiées, et n'ont pas été générées ou synthétisées par IA",
        "Elles ne violent le droit d'auteur ni aucun autre droit de propriété intellectuelle de qui que ce soit d'autre",
        'Vous avez le droit d’accorder à VozIt la licence décrite ci-dessous',
        "Vous ne figurez sur aucune liste de sanctions gouvernementales (y compris la liste OFAC du Trésor américain, ou des listes équivalentes de l'UE ou de l'ONU)",
      ],
    },
    {
      heading: 'La licence que vous accordez à VozIt',
      paragraphs: [
        "Vous conservez l'entière propriété des droits d'auteur de tout ce que vous soumettez. En le soumettant, vous accordez à VozIt une licence mondiale, non exclusive et sous-licenciable pour héberger, afficher, distribuer, filigraner, promouvoir et sous-licencier votre contenu via la plateforme de VozIt, ses canaux de réseaux sociaux et son programme de licence, conformément au partage des revenus décrit ci-dessous.",
      ],
    },
    {
      heading: 'Partage des revenus',
      paragraphs: [
        'Vous percevez une part des revenus publicitaires, des frais de licence et des frais de mission générés par votre contenu, au taux lié à votre niveau actuel :',
      ],
      table: {
        headers: ['Niveau', 'Votre part'],
        rows: [
          ['Starter', '40%'],
          ['Silver', '45%'],
          ['Gold', '50%'],
          ['Platinum', '55%'],
        ],
      },
    },
    {
      heading: 'Comment les revenus de licence sont réellement répartis',
      paragraphs: [
        "Pour les frais de licence spécifiquement : VozIt retient 30 % des frais comme redevance de plateforme couvrant la modération, la distribution et l'infrastructure, et votre pourcentage de niveau s'applique ensuite aux 70 % restants. Les taux de niveau peuvent être ajustés à l'avenir ; les changements ne s'appliquent jamais rétroactivement aux revenus que vous avez déjà perçus. Les paiements sont traités par des prestataires tiers et vérifiés par rapport aux listes de sanctions de l'OFAC avant leur libération.",
      ],
    },
    {
      heading: 'Demander la suppression',
      paragraphs: [
        "Vous pouvez demander à VozIt de supprimer votre contenu à tout moment. La suppression n'annule pas une licence que VozIt avait déjà accordée à une organisation de médias avant votre demande : cette licence reste valide pour sa durée initiale.",
      ],
    },
    {
      heading: 'Les droits de VozIt sur votre contenu',
      paragraphs: [
        "VozIt peut refuser de publier, flouter des parties choquantes, apposer un filigrane, ou supprimer du contenu qui enfreint les Conditions d'utilisation ou la loi applicable.",
      ],
    },
    {
      heading: 'Indemnisation',
      paragraphs: [
        "Vous acceptez d'indemniser VozIt contre les réclamations découlant de votre contenu, y compris les réclamations pour violation de droits d'auteur, diffamation ou atteinte à la vie privée formulées par un tiers concernant ce que vous avez soumis.",
      ],
    },
  ],
  contactLabel: 'Des questions sur cet accord : écrivez à',
}
