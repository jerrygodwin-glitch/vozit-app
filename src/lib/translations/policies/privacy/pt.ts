import type { PolicyContent } from '../types'

export const content: PolicyContent = {
  title: 'Política de Privacidade',
  updatedLabel: 'Última atualização: novembro de 2026',
  aiTranslatedLabel: 'Traduzido por IA — última revisão: novembro de 2026',
  viewInEnglishLabel: 'Esta é uma tradução oferecida por conveniência. A versão em inglês é o documento juridicamente vinculativo.',
  viewInEnglishLinkText: 'Ver em inglês',
  intro: [
    'A VozIt! ("VozIt", "nós") opera uma plataforma de jornalismo cidadão onde repórteres capturam e compartilham vídeos de testemunhas oculares, e espectadores leem, assistem e apoiam esse jornalismo. Esta política explica quais informações coletamos, por que as coletamos e como são usadas, inclusive para a publicidade que ajuda a financiar a VozIt e pagar os repórteres.',
  ],
  sections: [
    {
      heading: 'Informações que coletamos',
      paragraphs: [
        { label: 'Informações da conta.', text: 'Endereço de e-mail, nome de usuário, nome de exibição e senha (armazenada com segurança, nunca em texto simples) quando você se registra. Se você entrar com Google ou Facebook, recebemos em vez disso seu nome, e-mail e foto de perfil desse provedor.' },
        { label: 'Conteúdo do relato e dados de verificação.', text: 'Quando você envia um relato, coletamos o próprio vídeo junto com a localização (coordenadas GPS), orientação do dispositivo (direção da bússola e inclinação), altitude e fuso horário, lidos diretamente dos próprios sensores do seu dispositivo no momento da captura. Esses dados de "verdade fundamental" são essenciais para como a VozIt verifica que um relato foi genuinamente filmado onde e quando afirma, e são exibidos ao lado dos relatos publicados como parte de seus sinais de credibilidade.' },
        { label: 'Informações de pagamento.', text: 'Se você recebe pagamentos ou faz um pagamento (por exemplo, ao licenciar um relato), os detalhes de pagamento são coletados e processados por nossos parceiros de pagamento (incluindo Stripe e nossos provedores de pagamento). A VozIt não armazena os números completos do seu cartão ou conta bancária em seus próprios servidores.' },
        { label: 'Informações de uso e dispositivo.', text: 'Endereço IP, tipo de navegador/dispositivo e dados técnicos semelhantes, usados para segurança (por exemplo, detectar padrões de votação fraudulentos) e para manter o serviço confiável.' },
        { label: 'Cookies.', text: 'Usamos cookies para manter você conectado e lembrar suas preferências. Se a publicidade estiver ativa na VozIt, o Google e seus parceiros de publicidade também podem usar cookies e tecnologias semelhantes para veicular e medir anúncios; veja "Publicidade" abaixo.' },
      ],
    },
    {
      heading: 'Como usamos as informações',
      list: [
        'Para operar a plataforma: publicar relatos, processar pagamentos e mostrar a você conteúdo relevante',
        'Para verificar a autenticidade dos relatos usando dados de localização e sensores obtidos do dispositivo',
        'Para moderar o conteúdo por segurança e conformidade legal antes da publicação',
        'Para detectar e prevenir fraudes, incluindo contas falsas e votação manipulada',
        'Para nos comunicarmos com você: verificação de conta, redefinição de senha e atualizações do serviço',
        'Para cumprir obrigações legais, incluindo verificação de sanções e conformidade de pagamentos nos saques',
      ],
    },
    {
      heading: 'Publicidade',
      paragraphs: [
        'A VozIt usa o Google AdSense para exibir anúncios que ajudam a financiar a plataforma e a pagar aos repórteres sua parte da receita. O Google e seus parceiros usam cookies para veicular anúncios com base em suas visitas à VozIt e a outros sites, e para medir o desempenho dos anúncios. Você pode saber mais sobre como o Google usa esses dados, e controlar suas configurações de personalização de anúncios, por meio da política de sites parceiros do Google e das configurações de anúncios do Google (vinculadas a partir da versão em inglês desta página). Se você estiver no Espaço Econômico Europeu, é necessário consentimento adicional antes da exibição de anúncios personalizados; sem ele, você verá anúncios não personalizados em vez disso.',
      ],
    },
    {
      heading: 'Com quem compartilhamos informações',
      paragraphs: [
        'Compartilhamos informações com os prestadores de serviços que fazem a VozIt funcionar, cada um apenas para a finalidade de fornecer seu serviço específico:',
      ],
      list: [
        'Supabase — dados de conta, dados de relatos e autenticação',
        'Mux — hospedagem, transmissão e processamento de vídeo',
        'Stripe e nossos provedores de pagamento — pagamentos e repasses aos repórteres',
        'Hive — moderação de conteúdo automatizada',
        'Anthropic (Claude) — analisa o texto do relato para o resumo dos 5Ws exibido com cada relato, e traduz o conteúdo dos relatos e os envios por chat entre idiomas. A Anthropic processa esse texto para realizar essas funções e não o utiliza para treinar seus modelos.',
        'Resend — e-mail transacional (verificação de conta, redefinição de senha)',
        'Google (AdSense) — publicidade, conforme descrito acima',
        'Telegram — se você enviar um relato conversando com o bot do Telegram da VozIt em vez do site, o Telegram leva essa conversa (incluindo seu vídeo e qualquer localização que você compartilhe) aos nossos servidores da mesma forma que leva qualquer outra mensagem que você envie em sua plataforma',
      ],
    },
    {
      heading: 'Relatos publicados são públicos',
      paragraphs: [
        'Relatos publicados, incluindo seu título, descrição, vídeo e localização, são públicos por design: esse é o propósito do jornalismo cidadão. Não vendemos suas informações pessoais de conta (e-mail, senha, detalhes de pagamento) a terceiros.',
      ],
    },
    {
      heading: 'Suas escolhas',
      paragraphs: [
        'Você pode atualizar as informações da sua conta em Configurações a qualquer momento. Você pode excluir sua própria conta a qualquer momento em Configurações, ou entrando em contato conosco pelo e-mail abaixo. Observe que relatos publicados podem permanecer disponíveis como parte do registro público, de forma consistente com o funcionamento dos arquivos jornalísticos, mesmo após a exclusão de uma conta.',
      ],
    },
    {
      heading: 'Privacidade das crianças',
      paragraphs: [
        'A VozIt não é direcionada a crianças menores de 13 anos, e você deve ter pelo menos 13 anos para criar uma conta, em conformidade com a Lei de Proteção à Privacidade Infantil Online dos EUA (COPPA) e leis semelhantes em outros lugares. Não coletamos conscientemente informações pessoais de ninguém menor de 13 anos. Se soubermos que coletamos informações de uma criança menor de 13 anos sem o consentimento de um dos pais ou responsável, excluiremos essa conta e seus dados. Se você acredita que uma criança criou uma conta ou aparece em um relato, entre em contato conosco pelo e-mail abaixo e investigaremos prontamente.',
      ],
    },
    {
      heading: 'Alterações a esta política',
      paragraphs: [
        'Podemos atualizar esta política à medida que a VozIt evolui. Atualizaremos a data de "Última atualização" acima quando o fizermos.',
      ],
    },
  ],
  contactLabel: 'Dúvidas sobre esta política ou seus dados? Envie um e-mail para',
}
