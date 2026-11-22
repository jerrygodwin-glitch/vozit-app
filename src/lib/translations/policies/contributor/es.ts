import type { PolicyContent } from '../types'

export const content: PolicyContent = {
  title: 'Acuerdo de Reportero y Colaborador',
  updatedLabel: 'Última actualización: noviembre de 2026',
  aiTranslatedLabel: 'Traducido por IA — última revisión: noviembre de 2026',
  viewInEnglishLabel: 'Esta es una traducción ofrecida para tu comodidad. La versión en inglés es el documento legalmente vinculante.',
  viewInEnglishLinkText: 'Ver en inglés',
  intro: [
    'Esto rige tu relación con VozIt como reportero que envía contenido, junto con, no en lugar de, los Términos de Servicio de VozIt. Se aplica sin importar cómo envíes tu contenido: el sitio web, o el bot de Telegram de VozIt, y cualquier otro canal de envío que VozIt agregue en el futuro.',
  ],
  sections: [
    {
      heading: 'Lo que certificas al enviar un reporte',
      paragraphs: ['Al enviar un reporte, certificas todo lo siguiente:'],
      list: [
        'Tú mismo capturaste este material, en el momento y lugar que has indicado',
        'El material es genuino y no ha sido alterado, y no fue generado o sintetizado por IA',
        'No infringe los derechos de autor ni otros derechos de propiedad intelectual de nadie más',
        'Tienes el derecho de otorgar a VozIt la licencia descrita a continuación',
        'No estás en ninguna lista de sanciones gubernamentales (incluida la lista OFAC del Departamento del Tesoro de EE. UU., o listas equivalentes de la UE o la ONU)',
      ],
    },
    {
      heading: 'La licencia que otorgas a VozIt',
      paragraphs: [
        'Conservas la plena propiedad de los derechos de autor de todo lo que envías. Al enviarlo, otorgas a VozIt una licencia mundial, no exclusiva y sublicenciable para alojar, mostrar, distribuir, marcar con marca de agua, promocionar y sublicenciar tu contenido a través de la plataforma de VozIt, sus canales de redes sociales y su programa de licencias, de acuerdo con el reparto de ingresos descrito a continuación.',
      ],
    },
    {
      heading: 'Reparto de ingresos',
      paragraphs: [
        'Ganas una parte de los ingresos por publicidad, las tarifas de licencia y las tarifas de asignaciones que genera tu contenido, a la tasa vinculada a tu nivel actual:',
      ],
      table: {
        headers: ['Nivel', 'Tu parte'],
        rows: [
          ['Starter', '40%'],
          ['Silver', '45%'],
          ['Gold', '50%'],
          ['Platinum', '55%'],
        ],
      },
    },
    {
      heading: 'Cómo se reparte realmente el ingreso por licencias',
      paragraphs: [
        'Para las tarifas de licencia específicamente: VozIt retiene el 30% de la tarifa como cargo de la plataforma que cubre moderación, distribución e infraestructura, y tu porcentaje de nivel se aplica luego al 70% restante. Las tasas de nivel pueden ajustarse en el futuro; los cambios nunca se aplican retroactivamente a los ingresos que ya has ganado. Los pagos se procesan a través de proveedores externos y se verifican contra las listas de sanciones de la OFAC antes de su liberación.',
      ],
    },
    {
      heading: 'Solicitar la eliminación',
      paragraphs: [
        'Puedes pedirle a VozIt que elimine tu contenido en cualquier momento. La eliminación no anula una licencia que VozIt ya había otorgado a una organización de medios antes de tu solicitud: esa licencia sigue siendo válida durante su duración original.',
      ],
    },
    {
      heading: 'Los derechos de VozIt sobre tu contenido',
      paragraphs: [
        'VozIt puede negarse a publicar, difuminar partes gráficas, marcar con marca de agua o eliminar contenido que viole los Términos de Servicio o la ley aplicable.',
      ],
    },
    {
      heading: 'Indemnización',
      paragraphs: [
        'Aceptas indemnizar a VozIt frente a reclamaciones derivadas de tu contenido, incluidas reclamaciones de infracción de derechos de autor, difamación o violación de privacidad presentadas por otra persona en relación con lo que enviaste.',
      ],
    },
  ],
  contactLabel: 'Preguntas sobre este acuerdo: escribe a',
}
