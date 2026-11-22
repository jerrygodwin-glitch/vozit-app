import type { PolicyContent } from '../types'

export const content: PolicyContent = {
  title: 'Acordo do Repórter e Colaborador',
  updatedLabel: 'Última atualização: novembro de 2026',
  aiTranslatedLabel: 'Traduzido por IA — última revisão: novembro de 2026',
  viewInEnglishLabel: 'Esta é uma tradução oferecida por conveniência. A versão em inglês é o documento juridicamente vinculativo.',
  viewInEnglishLinkText: 'Ver em inglês',
  intro: [
    'Isto rege sua relação com a VozIt como repórter que envia conteúdo, junto com, não no lugar dos, Termos de Serviço da VozIt. Aplica-se independentemente de como você envia: o site, ou o bot do Telegram da VozIt, e qualquer outro canal de envio que a VozIt adicionar no futuro.',
  ],
  sections: [
    {
      heading: 'O que você certifica ao enviar um relato',
      paragraphs: ['Ao enviar um relato, você certifica tudo o seguinte:'],
      list: [
        'Você capturou pessoalmente este material, no momento e local que indicou',
        'O material é genuíno e não foi alterado, e não foi gerado ou sintetizado por IA',
        'Não infringe direitos autorais nem outros direitos de propriedade intelectual de mais ninguém',
        'Você tem o direito de conceder à VozIt a licença descrita abaixo',
        'Você não está em nenhuma lista de sanções governamentais (incluindo a lista OFAC do Tesouro dos EUA, ou listas equivalentes da UE ou da ONU)',
      ],
    },
    {
      heading: 'A licença que você concede à VozIt',
      paragraphs: [
        "Você mantém a propriedade plena dos direitos autorais de tudo o que envia. Ao enviá-lo, você concede à VozIt uma licença mundial, não exclusiva e sublicenciável para hospedar, exibir, distribuir, aplicar marca d'água, promover e sublicenciar seu conteúdo através da plataforma da VozIt, seus canais de redes sociais e seu programa de licenciamento, de acordo com o compartilhamento de receita descrito abaixo.",
      ],
    },
    {
      heading: 'Compartilhamento de receita',
      paragraphs: [
        'Você ganha uma parte da receita de anúncios, taxas de licenciamento e taxas de atribuições geradas pelo seu conteúdo, na taxa vinculada ao seu nível atual:',
      ],
      table: {
        headers: ['Nível', 'Sua parte'],
        rows: [
          ['Starter', '40%'],
          ['Silver', '45%'],
          ['Gold', '50%'],
          ['Platinum', '55%'],
        ],
      },
    },
    {
      heading: 'Como a receita de licenciamento é realmente dividida',
      paragraphs: [
        'Para as taxas de licenciamento especificamente: a VozIt retém 30% da taxa como encargo da plataforma, cobrindo moderação, distribuição e infraestrutura, e sua porcentagem de nível então se aplica aos 70% restantes. As taxas de nível podem ser ajustadas no futuro; as mudanças nunca se aplicam retroativamente à receita que você já ganhou. Os pagamentos são processados por provedores terceirizados e verificados contra as listas de sanções da OFAC antes da liberação.',
      ],
    },
    {
      heading: 'Solicitar remoção',
      paragraphs: [
        'Você pode pedir à VozIt para remover seu conteúdo a qualquer momento. A remoção não anula uma licença que a VozIt já havia concedido a uma organização de mídia antes do seu pedido — essa licença permanece válida pela sua duração original.',
      ],
    },
    {
      heading: 'Os direitos da VozIt sobre seu conteúdo',
      paragraphs: [
        "A VozIt pode recusar-se a publicar, desfocar partes gráficas, aplicar marca d'água ou remover conteúdo que viole os Termos de Serviço ou a lei aplicável.",
      ],
    },
    {
      heading: 'Indenização',
      paragraphs: [
        'Você concorda em indenizar a VozIt contra reivindicações decorrentes do seu conteúdo, incluindo reivindicações de violação de direitos autorais, difamação ou violação de privacidade apresentadas por outra pessoa em relação ao que você enviou.',
      ],
    },
  ],
  contactLabel: 'Dúvidas sobre este acordo: envie um e-mail para',
}
