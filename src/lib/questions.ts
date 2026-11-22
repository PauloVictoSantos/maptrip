export type QuestionType = "boolean" | "scale_1_5" | "choice";

export type Question = {
  key: string;
  label: string;
  type: QuestionType;
  choices?: { value: string; label: string }[]; 
};

export const QUESTIONS_BY_CATEGORY: Record<string, Question[]> = {
  restaurante: [
    { key: "tem_banheiro", label: "Este lugar tem banheiro?", type: "boolean" },
    { key: "atendimento", label: "Como você avalia o atendimento?", type: "scale_1_5" },
    { key: "tem_estacionamento", label: "Tem estacionamento?", type: "boolean" },
    { key: "aceita_cartao", label: "Aceita cartão de crédito?", type: "boolean" },
    { key: "aceita_pix", label: "Aceita Pix?", type: "boolean" },
    { key: "tem_wifi", label: "Tem wifi gratuito?", type: "boolean" },
    {
      key: "faixa_preco",
      label: "Qual a faixa de preço?",
      type: "choice",
      choices: [
        { value: "$", label: "Econômico" },
        { value: "$$", label: "Moderado" },
        { value: "$$$", label: "Caro" },
        { value: "$$$$", label: "Muito caro" },
      ],
    },
    { key: "bom_para_criancas", label: "É bom para ir com crianças?", type: "boolean" },
    { key: "tem_opcao_vegetariana", label: "Tem opção vegetariana?", type: "boolean" },
    { key: "aceita_pet", label: "Aceita animais de estimação?", type: "boolean" },
    { key: "tem_delivery", label: "Faz entrega/delivery?", type: "boolean" },
    { key: "ambiente", label: "Como é o ambiente/decoração?", type: "scale_1_5" },
    { key: "tempo_espera", label: "O tempo de espera foi razoável?", type: "boolean" },
    {
      key: "melhor_horario",
      label: "Qual o melhor horário para ir?",
      type: "choice",
      choices: [
        { value: "manha", label: "Manhã" },
        { value: "tarde", label: "Tarde" },
        { value: "noite", label: "Noite" },
      ],
    },
  ],
  praia: [
    { key: "tem_quiosque", label: "Tem quiosque ou comida por perto?", type: "boolean" },
    { key: "tem_banheiro", label: "Tem banheiro público?", type: "boolean" },
    { key: "acesso_facil", label: "O acesso é fácil?", type: "scale_1_5" },
    { key: "tem_estacionamento", label: "Tem estacionamento?", type: "boolean" },
    { key: "agua_limpa", label: "A água é limpa?", type: "scale_1_5" },
    { key: "tem_sombra", label: "Tem áreas com sombra?", type: "boolean" },
    { key: "movimentada", label: "É muito movimentada?", type: "boolean" },
    { key: "boa_para_criancas", label: "É segura para crianças?", type: "boolean" },
    { key: "aceita_pet", label: "Aceita animais de estimação?", type: "boolean" },
    { key: "tem_aluguel_cadeiras", label: "Tem aluguel de cadeiras/guarda-sol?", type: "boolean" },
    {
      key: "melhor_epoca",
      label: "Qual a melhor época para visitar?",
      type: "choice",
      choices: [
        { value: "seca", label: "Época seca" },
        { value: "chuva", label: "Época de chuva" },
        { value: "qualquer", label: "Qualquer época" },
      ],
    },
  ],
  hotel: [
    { key: "cafe_incluso", label: "Café da manhã incluso?", type: "boolean" },
    { key: "tem_piscina", label: "Tem piscina?", type: "boolean" },
    { key: "limpeza", label: "Como você avalia a limpeza?", type: "scale_1_5" },
    { key: "tem_wifi", label: "O wifi funciona bem?", type: "boolean" },
    { key: "tem_estacionamento", label: "Tem estacionamento?", type: "boolean" },
    { key: "check_in_facil", label: "O check-in foi rápido?", type: "boolean" },
    { key: "aceita_pet", label: "Aceita animais de estimação?", type: "boolean" },
    { key: "tem_ar_condicionado", label: "Os quartos têm ar-condicionado?", type: "boolean" },
    { key: "vista", label: "Como é a vista do quarto?", type: "scale_1_5" },
    {
      key: "faixa_preco",
      label: "Qual a faixa de preço da diária?",
      type: "choice",
      choices: [
        { value: "$", label: "Econômico" },
        { value: "$$", label: "Moderado" },
        { value: "$$$", label: "Caro" },
        { value: "$$$$", label: "Muito caro" },
      ],
    },
  ],
  natureza: [
    { key: "trilha_dificil", label: "Qual a dificuldade da trilha?", type: "scale_1_5" },
    { key: "tem_banheiro", label: "Tem banheiro na entrada?", type: "boolean" },
    { key: "precisa_guia", label: "Precisa de guia?", type: "boolean" },
    { key: "tem_estacionamento", label: "Tem estacionamento?", type: "boolean" },
    { key: "sinal_celular", label: "Tem sinal de celular no local?", type: "boolean" },
    { key: "boa_para_criancas", label: "É adequado para crianças?", type: "boolean" },
    {
      key: "melhor_horario",
      label: "Qual o melhor horário para ir?",
      type: "choice",
      choices: [
        { value: "manha", label: "Manhã cedo" },
        { value: "tarde", label: "Tarde" },
        { value: "por_do_sol", label: "Pôr do sol" },
      ],
    },
    { key: "cobra_entrada", label: "Cobra entrada?", type: "boolean" },
  ],
  default: [
    { key: "tem_banheiro", label: "Este lugar tem banheiro?", type: "boolean" },
    { key: "tem_estacionamento", label: "Tem estacionamento?", type: "boolean" },
    { key: "aceita_cartao", label: "Aceita cartão?", type: "boolean" },
    { key: "acessibilidade", label: "É acessível para cadeirantes?", type: "boolean" },
  ],
};

export function getQuestionsForCategory(category: string | null): Question[] {
  if (!category) return [];
  return QUESTIONS_BY_CATEGORY[category] || QUESTIONS_BY_CATEGORY.default;
}