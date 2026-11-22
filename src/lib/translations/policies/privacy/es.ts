import type { PolicyContent } from '../types'

export const content: PolicyContent = {
  title: 'Política de Privacidad',
  updatedLabel: 'Última actualización: noviembre de 2026',
  aiTranslatedLabel: 'Traducido por IA — última revisión: noviembre de 2026',
  viewInEnglishLabel: 'Esta es una traducción ofrecida para tu comodidad. La versión en inglés es el documento legalmente vinculante.',
  viewInEnglishLinkText: 'Ver en inglés',
  intro: [
    'VozIt! ("VozIt", "nosotros") opera una plataforma de periodismo ciudadano donde los reporteros capturan y comparten video de testigos presenciales, y los espectadores leen, ven y apoyan ese periodismo. Esta política explica qué información recopilamos, por qué la recopilamos y cómo se usa, incluso para la publicidad que ayuda a financiar VozIt y pagar a los reporteros.',
  ],
  sections: [
    {
      heading: 'Información que recopilamos',
      paragraphs: [
        { label: 'Información de la cuenta.', text: 'Dirección de correo electrónico, nombre de usuario, nombre para mostrar y contraseña (almacenada de forma segura, nunca en texto plano) cuando te registras. Si inicias sesión con Google o Facebook, en su lugar recibimos tu nombre, correo electrónico y foto de perfil de ese proveedor.' },
        { label: 'Contenido del reporte y datos de verificación.', text: 'Cuando envías un reporte, recopilamos el video en sí junto con la ubicación (coordenadas GPS), orientación del dispositivo (rumbo de la brújula e inclinación), altitud y zona horaria, leídos directamente de los propios sensores de tu dispositivo en el momento de la captura. Estos datos de "verdad fundamental" son esenciales para cómo VozIt verifica que un reporte fue genuinamente filmado donde y cuando afirma, y se muestran junto a los reportes publicados como parte de sus señales de credibilidad.' },
        { label: 'Información de pago.', text: 'Si recibes pagos o realizas un pago (por ejemplo, al licenciar un reporte), los datos de pago son recopilados y procesados por nuestros socios de pago (incluidos Stripe y nuestros proveedores de pago). VozIt no almacena los números completos de tu tarjeta o cuenta bancaria en sus propios servidores.' },
        { label: 'Información de uso y dispositivo.', text: 'Dirección IP, tipo de navegador/dispositivo y datos técnicos similares, utilizados para seguridad (por ejemplo, detectar patrones de votación fraudulentos) y para mantener el servicio confiable.' },
        { label: 'Cookies.', text: 'Usamos cookies para mantenerte conectado y recordar tus preferencias. Si la publicidad está activa en VozIt, Google y sus socios publicitarios también pueden usar cookies y tecnologías similares para mostrar y medir anuncios; consulta "Publicidad" abajo.' },
      ],
    },
    {
      heading: 'Cómo usamos la información',
      list: [
        'Para operar la plataforma: publicar reportes, procesar pagos y mostrarte contenido relevante',
        'Para verificar la autenticidad de los reportes usando datos de ubicación y sensores obtenidos del dispositivo',
        'Para moderar el contenido por seguridad y cumplimiento legal antes de la publicación',
        'Para detectar y prevenir fraudes, incluidas cuentas falsas y votaciones manipuladas',
        'Para comunicarnos contigo: verificación de cuenta, restablecimiento de contraseña y actualizaciones del servicio',
        'Para cumplir con obligaciones legales, incluido el cumplimiento de sanciones y pagos en los retiros',
      ],
    },
    {
      heading: 'Publicidad',
      paragraphs: [
        'VozIt usa Google AdSense para mostrar anuncios que ayudan a financiar la plataforma y a pagar a los reporteros su parte de los ingresos. Google y sus socios usan cookies para mostrar anuncios según tus visitas a VozIt y otros sitios, y para medir el rendimiento de los anuncios. Puedes obtener más información sobre cómo Google usa estos datos, y controlar tu configuración de personalización de anuncios, a través de la Política de sitios asociados de Google y la Configuración de anuncios de Google (enlazadas desde la versión en inglés de esta página). Si te encuentras en el Espacio Económico Europeo, se requiere consentimiento adicional antes de mostrar anuncios personalizados; sin él, verás anuncios no personalizados en su lugar.',
      ],
    },
    {
      heading: 'Con quién compartimos información',
      paragraphs: [
        'Compartimos información con los proveedores de servicios que hacen que VozIt funcione, cada uno solo para el propósito de proporcionar su servicio específico:',
      ],
      list: [
        'Supabase: datos de cuenta, datos de reportes y autenticación',
        'Mux: alojamiento, transmisión y procesamiento de video',
        'Stripe y nuestros proveedores de pago: pagos y retiros de reporteros',
        'Hive: moderación de contenido automatizada',
        'Anthropic (Claude): analiza el texto del reporte para el resumen de las 5W que se muestra con cada reporte, y traduce el contenido de los reportes y los envíos por chat entre idiomas. Anthropic procesa este texto para realizar estas funciones y no lo utiliza para entrenar sus modelos.',
        'Resend: correo electrónico transaccional (verificación de cuenta, restablecimiento de contraseña)',
        'Google (AdSense): publicidad, como se describe arriba',
        'Telegram: si envías un reporte conversando con el bot de Telegram de VozIt en lugar del sitio web, Telegram lleva esa conversación (incluido tu video y cualquier ubicación que compartas) a nuestros servidores de la misma manera que lleva cualquier otro mensaje que envíes en su plataforma',
      ],
    },
    {
      heading: 'Los reportes publicados son públicos',
      paragraphs: [
        'Los reportes publicados, incluidos su título, descripción, video y ubicación, son públicos por diseño: ese es el objetivo del periodismo ciudadano. No vendemos tu información personal de cuenta (correo electrónico, contraseña, datos de pago) a terceros.',
      ],
    },
    {
      heading: 'Tus opciones',
      paragraphs: [
        'Puedes actualizar la información de tu cuenta desde Configuración en cualquier momento. Puedes eliminar tu propia cuenta en cualquier momento desde Configuración, o contactándonos en el correo electrónico de abajo. Ten en cuenta que los reportes publicados pueden permanecer disponibles como parte del registro público, de manera consistente con cómo funcionan los archivos periodísticos, incluso después de eliminar una cuenta.',
      ],
    },
    {
      heading: 'Privacidad de los menores',
      paragraphs: [
        'VozIt no está dirigido a menores de 13 años, y debes tener al menos 13 años para crear una cuenta, de acuerdo con la Ley de Protección de la Privacidad Infantil en Línea de EE. UU. (COPPA) y leyes similares en otros lugares. No recopilamos a sabiendas información personal de nadie menor de 13 años. Si nos enteramos de que hemos recopilado información de un menor de 13 años sin el consentimiento de un padre o tutor, eliminaremos esa cuenta y sus datos. Si crees que un menor ha creado una cuenta o aparece en un reporte, contáctanos en el correo electrónico de abajo y lo investigaremos de inmediato.',
      ],
    },
    {
      heading: 'Cambios a esta política',
      paragraphs: [
        'Podemos actualizar esta política a medida que VozIt evoluciona. Actualizaremos la fecha de "Última actualización" de arriba cuando lo hagamos.',
      ],
    },
  ],
  contactLabel: '¿Preguntas sobre esta política o tus datos? Escribe a',
}
