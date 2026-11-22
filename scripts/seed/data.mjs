// Seed data — Manaus, AM.
// Public landmarks use their real names; hotels, restaurants, bars, cafés and
// snack bars are FICTIONAL so no real business gets invented reviews.

export const USERS = [
  // ---- friends (mutual follow with you) ----
  { key: "caio", username: "caio_mendes", name: "Caio Mendes", bio: "Professor de história, sempre atrás de um prédio antigo.", friend: true },
  { key: "bia", username: "beatriz_lopes", name: "Beatriz Lopes", bio: "Fotógrafa. Pôr do sol na Ponta Negra é meu escritório.", friend: true },
  { key: "rafa", username: "rafael_souza", name: "Rafael Souza", bio: "Cozinheiro nas horas vagas e crítico de tambaqui em tempo integral.", friend: true },
  { key: "marina", username: "marina_alves", name: "Marina Alves", bio: "Vegana, ciclista e caçadora de cafés.", friend: true },
  { key: "joao", username: "joao_pereira", name: "João Pereira", bio: "Pai de dois. Sempre procurando lugar bom pra criança.", friend: true },
  // ---- not friends ----
  { key: "larissa", username: "larissa_costa", name: "Larissa Costa", bio: "Guia de turismo em Manaus há 8 anos.", friend: false, followsYou: true },
  { key: "thiago", username: "thiago_ramos", name: "Thiago Ramos", bio: "Happy hour é compromisso.", friend: false },
  { key: "fernanda", username: "fernanda_lima", name: "Fernanda Lima", bio: "Viajo a trabalho e avalio hotel por esporte.", friend: false },
  { key: "gabriel", username: "gabriel_nunes", name: "Gabriel Nunes", bio: "Estudante da UFAM. Lanche bom e barato.", friend: false, followsYou: true },
  { key: "carol", username: "ana_carolina", name: "Ana Carolina Melo", bio: "Cadeirante. Mapeio acessibilidade pela cidade.", friend: false },
];

// Who follows whom among the seed users (one direction each).
export const SEED_FOLLOWS = [
  ["caio", "bia"], ["bia", "caio"], ["rafa", "marina"], ["marina", "rafa"], ["joao", "caio"],
  ["larissa", "thiago"], ["thiago", "larissa"], ["fernanda", "larissa"], ["gabriel", "thiago"],
  ["carol", "larissa"], ["larissa", "carol"], ["bia", "larissa"], ["rafa", "thiago"],
];

// review: [userKey, rating, text, { title?, visibility?, photos?, time?, daysAgo? }]
export const PLACES = [
  // ======================== Pontos turísticos ========================
  {
    name: "Teatro Amazonas", cat: "monumento", lat: -3.13031, lng: -60.02339, scenes: ["theatre"],
    traits: { acc: true, card: true, parking: false, banheiro: true },
    reviews: [
      ["caio", 5, "A visita guiada vale cada minuto. A cúpula com as 36 mil escamas de cerâmica é ainda mais bonita de perto, e o salão nobre é de cair o queixo.", { photos: 3, daysAgo: 2 }],
      ["larissa", 5, "Levo grupos toda semana e ainda me emociono. Dica: os concertos gratuitos de quarta são concorridos, chegue 40 min antes.", { photos: 2, time: "night" }],
      ["carol", 4, "Tem elevador e a equipe ajuda bastante, mas a calçada de pedras portuguesas do largo é complicada pra cadeira de rodas.", { photos: 1 }],
      ["gabriel", 5, "Fui no Festival de Ópera de graça. Experiência que todo manauara devia ter.", { time: "night", daysAgo: 40 }],
    ],
  },
  {
    name: "Largo de São Sebastião", cat: "parque", lat: -3.13065, lng: -60.02282, scenes: ["theatre", "square"],
    traits: { acc: false, banheiro: false, card: true },
    reviews: [
      ["bia", 5, "Fim de tarde aqui é obrigatório: tacacá, música ao vivo e o teatro iluminado. O calçadão ondulado rende foto linda.", { photos: 2, time: "sunset", daysAgo: 1 }],
      ["thiago", 4, "Bom pra começar a noite. Fica cheio no fim de semana, mas o clima é ótimo.", { time: "night", photos: 1 }],
      ["joao", 4, "As crianças adoram correr pelo largo enquanto a gente toma um sorvete regional.", { visibility: "friends" }],
    ],
  },
  {
    name: "Palácio Rio Negro", cat: "museu", lat: -3.13254, lng: -60.03372, scenes: ["palace"],
    traits: { acc: true, banheiro: true, card: false, fee: false },
    reviews: [
      ["caio", 5, "Antiga residência dos governadores, hoje centro cultural. Entrada gratuita e o acervo sobre o ciclo da borracha é excelente.", { photos: 2 }],
      ["larissa", 4, "Ótima parada entre o Centro e a Sete de Setembro. Os jardins são tranquilos para descansar.", {}],
    ],
  },
  {
    name: "Mercado Municipal Adolpho Lisboa", cat: "compras", lat: -3.14079, lng: -60.02381, scenes: ["market"],
    traits: { acc: true, banheiro: true, card: true, parking: false },
    reviews: [
      ["rafa", 5, "Estrutura de ferro art nouveau linda. Comprei tucumã, farinha do Uarini e pimenta murupi. Vá cedo, com o mercado mais fresco.", { photos: 2, time: "morning", daysAgo: 5 }],
      ["marina", 4, "Muita fruta regional que não se acha em outro lugar: cupuaçu, bacuri, camu-camu. Leve sacola.", { photos: 1 }],
      ["fernanda", 4, "Bom para levar lembrancinhas. Pechinche nas bancas de artesanato.", {}],
    ],
  },
  {
    name: "Encontro das Águas", cat: "parque", lat: -3.13650, lng: -59.90420, scenes: ["waters"],
    traits: { acc: false, banheiro: true, card: true, fee: true },
    reviews: [
      ["larissa", 5, "Os rios Negro e Solimões correndo lado a lado sem se misturar por quilômetros. Indico o passeio de barco saindo do porto pela manhã.", { photos: 2, time: "day", daysAgo: 3 }],
      ["fernanda", 5, "Passeio de meio período, bem organizado. Coloque a mão na água: um lado é quente e o outro é frio!", { photos: 1 }],
      ["joao", 4, "Os meninos amaram ver os botos. Leve protetor solar e chapéu.", { photos: 1, daysAgo: 60 }],
    ],
  },
  {
    name: "Praia da Ponta Negra", cat: "praia", lat: -3.06205, lng: -60.10496, scenes: ["beach"],
    traits: { acc: true, banheiro: true, parking: true, kids: true, pet: false, quality: 4, season: "seca" },
    reviews: [
      ["bia", 5, "Melhor pôr do sol da cidade. O calçadão é ótimo pra caminhar e o rio fica dourado no fim da tarde.", { photos: 3, time: "sunset", daysAgo: 0 }],
      ["thiago", 4, "Domingo à tarde é cheio, mas vale. Os quiosques têm cerveja gelada e peixe frito.", { photos: 1, time: "sunset" }],
      ["joao", 4, "Na seca a faixa de areia fica enorme. Tem salva-vidas e área bem cuidada.", { visibility: "friends", photos: 1 }],
      ["carol", 4, "O calçadão tem rampas e piso regular; a descida até a areia é que não é acessível.", {}],
    ],
  },
  {
    name: "Ponte Rio Negro (mirante)", cat: "monumento", lat: -3.11052, lng: -60.08860, scenes: ["bridge"],
    traits: { acc: false, banheiro: false, parking: true },
    reviews: [
      ["bia", 4, "A ponte iluminada à noite rende fotos incríveis. O melhor ângulo é do calçadão da Ponta Negra.", { photos: 2, time: "night" }],
      ["gabriel", 4, "Passeio de bicicleta até a ponte no domingo cedo é top.", { time: "morning" }],
    ],
  },
  {
    name: "Catedral Metropolitana de Manaus", cat: "monumento", lat: -3.13707, lng: -60.02417, scenes: ["church"],
    traits: { acc: true, banheiro: false, fee: false },
    reviews: [
      ["caio", 4, "A Igreja da Matriz é uma das construções mais antigas da cidade. Interior simples e bonito, ótimo para uma pausa no Centro.", { photos: 1 }],
      ["larissa", 4, "Sempre incluo no roteiro a pé pelo Centro Histórico.", {}],
    ],
  },
  {
    name: "Paço da Liberdade", cat: "museu", lat: -3.13775, lng: -60.02518, scenes: ["palaceRose"],
    traits: { acc: true, banheiro: true, fee: false },
    reviews: [
      ["caio", 5, "Museu da Cidade com maquetes e exposições sobre a história de Manaus. Gratuito e muito bem montado.", { photos: 2, daysAgo: 12 }],
      ["carol", 5, "Totalmente acessível: elevador, piso tátil e equipe atenciosa. Um exemplo pra cidade.", { photos: 1 }],
    ],
  },
  {
    name: "Palácio da Justiça", cat: "museu", lat: -3.12958, lng: -60.02469, scenes: ["palace"],
    traits: { acc: true, banheiro: true, fee: false },
    reviews: [["caio", 4, "Arquitetura neoclássica linda, bem em frente ao Teatro. A visita guiada é curta e gratuita.", { photos: 1 }]],
  },
  {
    name: "Museu do Seringal Vila Paraíso", cat: "museu", lat: -3.03960, lng: -60.17950, scenes: ["forest", "palace"],
    traits: { acc: false, banheiro: true, fee: true },
    reviews: [
      ["larissa", 5, "Réplica de um seringal do século XIX, chega-se de barco. Os guias explicam todo o processo da borracha.", { photos: 2 }],
      ["fernanda", 4, "Passeio diferente para quem tem uma manhã livre. Combine com o almoço na Ponta Negra.", {}],
    ],
  },

  // ======================== Natureza / praças ========================
  {
    name: "Museu da Amazônia (MUSA)", cat: "trilha", lat: -3.00378, lng: -59.93969, scenes: ["forestTower", "forest"],
    traits: { acc: false, banheiro: true, parking: true, fee: true },
    reviews: [
      ["marina", 5, "A torre de 42 metros acima da copa das árvores é inesquecível. Fui no primeiro horário e vi tucanos.", { photos: 3, time: "morning", daysAgo: 4 }],
      ["joao", 5, "Trilhas curtas e seguras, ótimas para crianças. Leve repelente.", { photos: 1 }],
      ["carol", 2, "Infelizmente as trilhas e a torre não são acessíveis. A área do aquário dá para visitar.", {}],
    ],
  },
  {
    name: "Bosque da Ciência (INPA)", cat: "parque", lat: -3.09793, lng: -59.98718, scenes: ["forest"],
    traits: { acc: true, banheiro: true, parking: true, fee: true },
    reviews: [
      ["joao", 5, "Peixe-boi, ariranhas e macacos-de-cheiro soltos nas árvores. Programa perfeito de sábado com as crianças.", { photos: 2, daysAgo: 9 }],
      ["marina", 4, "Pedacinho de floresta dentro da cidade. Ingresso baratinho.", { photos: 1 }],
    ],
  },
  {
    name: "Parque do Mindu", cat: "parque", lat: -3.07816, lng: -60.00684, scenes: ["forest", "square"],
    traits: { acc: true, banheiro: true, parking: true, fee: false },
    reviews: [
      ["marina", 4, "Bom para correr cedinho, com trilhas suspensas e muita sombra.", { photos: 1, time: "morning" }],
      ["gabriel", 4, "Lugar tranquilo pra estudar ao ar livre no fim de semana.", {}],
      ["carol", 4, "Parte da trilha suspensa é acessível. Banheiros adaptados limpos.", {}],
    ],
  },
  {
    name: "Praça da Saudade", cat: "parque", lat: -3.12868, lng: -60.02813, scenes: ["square"],
    traits: { acc: true, banheiro: false },
    reviews: [
      ["gabriel", 4, "Revitalizada, com quiosques de lanche e espaço pra skate.", { photos: 1, time: "night" }],
      ["joao", 4, "Parquinho bom e bastante policiamento à noite.", { visibility: "friends" }],
    ],
  },
  {
    name: "Praça do Congresso", cat: "parque", lat: -3.12562, lng: -60.02178, scenes: ["square"],
    traits: { acc: true, banheiro: false },
    reviews: [
      ["thiago", 4, "Feirinha e food trucks à noite. Bom ponto de encontro antes de sair.", { photos: 1, time: "night", daysAgo: 6 }],
      ["caio", 3, "Bonita, mas falta manutenção em alguns bancos.", {}],
    ],
  },
  {
    name: "Praça Heliodoro Balbi (Praça da Polícia)", cat: "parque", lat: -3.13416, lng: -60.02692, scenes: ["square"],
    traits: { acc: true, banheiro: false },
    reviews: [["caio", 4, "Praça histórica com coreto e esculturas. Ótima no café da manhã antes de rodar o Centro.", { photos: 1, time: "morning" }]],
  },

  // ======================== Shopping ========================
  {
    name: "Manauara Shopping", cat: "compras", lat: -3.10480, lng: -60.01158, scenes: ["mall"],
    traits: { acc: true, banheiro: true, parking: true, card: true },
    reviews: [
      ["fernanda", 4, "Boa praça de alimentação e cinema. Ar-condicionado salva no calor de Manaus.", { photos: 1 }],
      ["carol", 5, "Acessível de ponta a ponta: vagas, elevadores, banheiros adaptados.", {}],
      ["gabriel", 3, "Bonito, mas bem caro pra estudante.", {}],
    ],
  },
  {
    name: "Amazonas Shopping", cat: "compras", lat: -3.09378, lng: -60.02268, scenes: ["mall"],
    traits: { acc: true, banheiro: true, parking: true, card: true },
    reviews: [
      ["joao", 4, "Tem área kids e fraldário bem equipado.", { photos: 1, daysAgo: 15 }],
      ["thiago", 4, "Bom de estacionamento e tem de tudo.", {}],
    ],
  },
  {
    name: "Shopping Ponta Negra", cat: "compras", lat: -3.08474, lng: -60.07215, scenes: ["mall"],
    traits: { acc: true, banheiro: true, parking: true, card: true },
    reviews: [["bia", 4, "O terraço tem vista bonita no fim da tarde. Bom para um café depois da praia.", { photos: 1, time: "sunset" }]],
  },
  {
    name: "Feira da Manaus Moderna", cat: "compras", lat: -3.13995, lng: -60.01990, scenes: ["market"],
    traits: { acc: false, banheiro: true, card: false },
    reviews: [
      ["rafa", 5, "Peixe fresquinho direto dos barcos: tambaqui, pirarucu, jaraqui. Chegue antes das 7h.", { photos: 1, time: "morning", daysAgo: 3 }],
      ["gabriel", 4, "Barato e autêntico. Leve dinheiro em espécie, nem todo mundo aceita cartão.", {}],
    ],
  },

  // ======================== Hotéis (fictícios) ========================
  {
    name: "Hotel Rio Negro Palace", cat: "hotel", lat: -3.13348, lng: -60.02253, scenes: ["hotel", "room"],
    traits: { breakfast: true, pool: true, wifi: true, parking: true, pet: false, ac: true, quality: 4, price: "$$$" },
    reviews: [
      ["fernanda", 4, "Localização perfeita, a duas quadras do Teatro. Café da manhã com tapioca na hora e frutas regionais.", { photos: 2, daysAgo: 8 }],
      ["larissa", 4, "Indico pros meus grupos. Quartos amplos e equipe atenciosa.", {}],
    ],
  },
  {
    name: "Pousada Flor de Vitória-Régia", cat: "hotel", lat: -3.06901, lng: -60.09812, scenes: ["hotel", "room"],
    traits: { breakfast: true, pool: true, wifi: true, parking: true, pet: true, ac: true, quality: 5, price: "$$" },
    reviews: [
      ["bia", 5, "Pertinho da praia, jardim lindo e aceita pet! Fiquei com a minha cachorra e fomos super bem recebidas.", { photos: 2, visibility: "friends" }],
      ["fernanda", 5, "Melhor custo-benefício da Ponta Negra. Silenciosa e muito limpa.", { photos: 1 }],
    ],
  },
  {
    name: "Amazon Lodge Adrianópolis", cat: "hotel", lat: -3.10152, lng: -60.01498, scenes: ["hotel", "room"],
    traits: { breakfast: false, pool: false, wifi: true, parking: true, pet: false, ac: true, quality: 3, price: "$$" },
    reviews: [
      ["fernanda", 3, "Funcional para trabalho, perto dos shoppings. O café da manhã é cobrado à parte e o Wi-Fi caiu algumas vezes.", { photos: 1 }],
      ["thiago", 4, "Bom pra quem vem a trabalho e quer ficar perto da Djalma Batista.", {}],
    ],
  },
  {
    name: "Hostel Largo do Teatro", cat: "hotel", lat: -3.13118, lng: -60.02497, scenes: ["room"],
    traits: { breakfast: true, pool: false, wifi: true, parking: false, pet: false, ac: true, quality: 4, price: "$" },
    reviews: [
      ["gabriel", 4, "Quarto coletivo limpo e baratinho, a um minuto do Teatro. Ótimo pra mochileiro.", { photos: 1 }],
      ["larissa", 4, "Recomendo para quem viaja sozinho; a equipe organiza passeios.", {}],
    ],
  },

  // ======================== Restaurantes — almoço e jantar (fictícios) ========================
  {
    name: "Peixaria Beira-Rio", cat: "restaurante", lat: -3.13958, lng: -60.02998, scenes: ["fish"],
    traits: { veg: false, pet: false, price: "$$", kids: true, card: true, quality: 4, best: "tarde" },
    reviews: [
      ["rafa", 5, "Costela de tambaqui na brasa perfeita, com baião de dois e farofa de banana. Vista para o rio.", { title: "Melhor tambaqui do Centro", photos: 2, daysAgo: 2 }],
      ["thiago", 4, "Porção de jaraqui frito com cerveja gelada. Atendimento demora um pouco no sábado.", { photos: 1 }],
      ["joao", 4, "Espaço amplo e cadeirão pra criança. Porção serve bem três pessoas.", {}],
    ],
  },
  {
    name: "Tambaqui de Banda Ponta Negra", cat: "restaurante", lat: -3.06422, lng: -60.10312, scenes: ["fish"],
    traits: { veg: false, pet: true, price: "$$$", kids: true, card: true, quality: 4, best: "noite" },
    reviews: [
      ["bia", 4, "Jantar com vista pro rio depois do pôr do sol. Peixe ótimo, preço salgado.", { photos: 2, time: "night" }],
      ["fernanda", 5, "Levei clientes e todos adoraram o pirarucu de casaca.", { photos: 1, daysAgo: 20 }],
    ],
  },
  {
    name: "Cozinha da Floresta", cat: "restaurante", lat: -3.10441, lng: -60.01802, scenes: ["fish", "breakfast"],
    traits: { veg: true, pet: true, price: "$$", kids: true, card: true, quality: 5, best: "tarde" },
    reviews: [
      ["marina", 5, "Cardápio 100% vegetal com ingredientes amazônicos. A moqueca de banana-pacova com tucupi é maravilhosa.", { title: "Vegano e regional", photos: 2, daysAgo: 1 }],
      ["carol", 5, "Entrada sem degraus, mesas com bom espaço e banheiro adaptado. E a comida é ótima!", { photos: 1 }],
      ["rafa", 4, "Mesmo não sendo vegano, saí satisfeito. O bolinho de pirarucu de caju engana qualquer um.", {}],
    ],
  },
  {
    name: "Sabor do Quintal", cat: "restaurante", lat: -3.13204, lng: -60.01997, scenes: ["fish"],
    traits: { veg: true, pet: false, price: "$", kids: true, card: true, quality: 4, best: "tarde" },
    reviews: [
      ["gabriel", 5, "Almoço por quilo honesto, com muita salada e opção vegetariana todo dia.", { photos: 1 }],
      ["caio", 4, "Comida caseira, rápido e barato. Bom pra quem trabalha no Centro.", { daysAgo: 7 }],
    ],
  },
  {
    name: "Bistrô Jaraqui", cat: "restaurante", lat: -3.10118, lng: -60.02803, scenes: ["fish", "pizza"],
    traits: { veg: true, pet: false, price: "$$$", kids: false, card: true, quality: 5, best: "noite" },
    reviews: [
      ["rafa", 5, "Releitura contemporânea da cozinha amazônica. O risoto de jambu com camarão é de outro mundo.", { title: "Jantar especial", photos: 2, time: "night", visibility: "friends" }],
      ["fernanda", 4, "Ambiente intimista, carta de vinhos boa. Reserve com antecedência.", { time: "night" }],
    ],
  },
  {
    name: "Pizzaria Cupuaçu", cat: "restaurante", lat: -3.08922, lng: -60.00697, scenes: ["pizza"],
    traits: { veg: true, pet: true, price: "$$", kids: true, card: true, quality: 4, best: "noite" },
    reviews: [
      ["joao", 5, "A pizza de tucumã com queijo coalho é sensacional e tem espaço kids.", { photos: 1, daysAgo: 3 }],
      ["thiago", 4, "Rodízio bom num preço justo.", { photos: 1, time: "night" }],
      ["marina", 3, "Têm duas opções veganas, mas a massa demorou bastante.", {}],
    ],
  },

  // ======================== Café da manhã (fictícios) ========================
  {
    name: "Café Regional Tapioca & Tucumã", cat: "cafe", lat: -3.13010, lng: -60.02151, scenes: ["breakfast"],
    traits: { acc: true, card: true, banheiro: true },
    reviews: [
      ["caio", 5, "X-caboquinho na tapioca com café coado. Café da manhã manauara raiz.", { title: "Café da manhã raiz", photos: 2, time: "morning", daysAgo: 1 }],
      ["marina", 4, "Pedi a tapioca de banana com castanha sem queijo, ficou ótima.", { photos: 1 }],
      ["larissa", 5, "Sempre levo turistas aqui antes do passeio no Teatro.", {}],
    ],
  },
  {
    name: "Padaria Pão do Rio", cat: "cafe", lat: -3.08803, lng: -59.99701, scenes: ["breakfast"],
    traits: { acc: true, card: true, banheiro: true },
    reviews: [
      ["joao", 4, "Pão quentinho às 6h e bolo de macaxeira imperdível.", { photos: 1, time: "morning" }],
      ["gabriel", 4, "Café com leite e misto quente por um preço camarada.", {}],
    ],
  },
  {
    name: "Raízes Café", cat: "cafe", lat: -3.09202, lng: -60.00402, scenes: ["breakfast", "acai"],
    traits: { acc: true, card: true, banheiro: true },
    reviews: [
      ["marina", 5, "Café especial de produtores do Amazonas e opções sem lactose. Ótimo para trabalhar à tarde.", { photos: 2, daysAgo: 6 }],
      ["bia", 4, "Ambiente lindo, cheio de plantas. Peça o cold brew de cupuaçu.", { photos: 1, visibility: "friends" }],
    ],
  },

  // ======================== Lanches (fictícios) ========================
  {
    name: "X-Caboquinho do Seu Zé", cat: "restaurante", lat: -3.11906, lng: -60.01198, scenes: ["burger"],
    traits: { veg: false, pet: true, price: "$", kids: true, card: true, quality: 4, best: "noite" },
    reviews: [
      ["gabriel", 5, "Melhor x-caboquinho da Cachoeirinha: tucumã, queijo coalho e banana frita no pão francês.", { title: "Lanche raiz", photos: 2, time: "night", daysAgo: 0 }],
      ["thiago", 4, "Depois da balada é parada obrigatória.", { time: "night" }],
      ["rafa", 4, "Simples e muito bem feito. O suco de taperebá é ótimo.", { photos: 1 }],
    ],
  },
  {
    name: "Food Truck Praça do Congresso", cat: "restaurante", lat: -3.12592, lng: -60.02151, scenes: ["burger"],
    traits: { veg: true, pet: true, price: "$", kids: true, card: true, quality: 3, best: "noite" },
    reviews: [
      ["gabriel", 4, "Hambúrguer artesanal barato e tem opção de lentilha.", { photos: 1, time: "night" }],
      ["marina", 3, "A opção vegana é boa, mas o lugar fica cheio e demora.", {}],
    ],
  },
  {
    name: "Açaí & Cia Ponta Negra", cat: "cafe", lat: -3.06612, lng: -60.10002, scenes: ["acai"],
    traits: { acc: true, card: true, banheiro: false },
    reviews: [
      ["bia", 5, "Açaí grosso de verdade, com farinha de tapioca ou banana. Perfeito depois da praia.", { photos: 1, time: "sunset", daysAgo: 2 }],
      ["joao", 4, "As crianças pedem toda vez que vamos à praia.", {}],
    ],
  },

  // ======================== Bares (fictícios) ========================
  {
    name: "Bar do Boto", cat: "bar", lat: -3.06683, lng: -60.09953, scenes: ["bar"],
    traits: { acc: false, card: true, banheiro: true },
    reviews: [
      ["thiago", 5, "Música ao vivo de quinta a domingo e a melhor caipirinha de cupuaçu da cidade.", { title: "Happy hour garantido", photos: 2, time: "night", daysAgo: 1 }],
      ["bia", 4, "Varanda com vista pro rio. Chegue antes das 20h pra pegar mesa.", { photos: 1, time: "night" }],
    ],
  },
  {
    name: "Choperia do Largo", cat: "bar", lat: -3.13002, lng: -60.02251, scenes: ["bar"],
    traits: { acc: true, card: true, banheiro: true },
    reviews: [
      ["thiago", 4, "Chope gelado e petiscos regionais com vista pro Teatro iluminado.", { photos: 1, time: "night" }],
      ["caio", 4, "Depois do concerto, ótimo pra conversar.", { time: "night", visibility: "friends" }],
      ["carol", 3, "Tem rampa na entrada, mas o banheiro não é adaptado.", {}],
    ],
  },
  {
    name: "Varanda do Rio Negro", cat: "bar", lat: -3.13811, lng: -60.03102, scenes: ["bar", "beach"],
    traits: { acc: false, card: true, banheiro: true },
    reviews: [
      ["thiago", 4, "Pôr do sol com samba no domingo. Porção de tambaqui frito é generosa.", { photos: 2, time: "sunset", daysAgo: 4 }],
      ["larissa", 4, "Levo turistas que querem um programa local sem ser pega-turista.", {}],
    ],
  },
  {
    name: "Boteco do Jaraqui", cat: "bar", lat: -3.11504, lng: -60.02010, scenes: ["bar"],
    traits: { acc: false, card: false, banheiro: true },
    reviews: [
      ["gabriel", 4, "Cerveja barata e jaraqui frito. Só aceita Pix e dinheiro.", { time: "night" }],
      ["thiago", 3, "Bom pra começar, mas fica muito cheio e quente.", { time: "night", visibility: "private" }],
    ],
  },
];

// Short comments seed users leave on each other's visits.
export const COMMENTS = [
  "Que lugar lindo! Preciso ir.",
  "Fui semana passada e concordo com tudo.",
  "Anotado pra próxima visita!",
  "Essa foto ficou incrível.",
  "Vamos marcar de ir juntos?",
  "Obrigado pela dica!",
  "Achei um pouco caro, mas vale a experiência.",
  "Melhor programa de Manaus.",
  "Levei minha família depois de ver seu post 😄",
  "O atendimento melhorou bastante, né?",
];
