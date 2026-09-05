import { z } from "zod";

export const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const ESTADO_CIVIL_OPTIONS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União estável",
  "Separado(a)",
] as const;

export const TIPO_IMOVEL_OPTIONS = [
  "Casa",
  "Sobrado",
  "Apartamento",
  "Cobertura",
  "Kitnet",
  "Studio",
  "Flat",
  "Terreno",
  "Área",
  "Sala comercial",
  "Galpão",
] as const;

export const ESTADO_IMOVEL_OPTIONS = ["Novo", "Usado", "Em construção"] as const;
export const SALAS_OPTIONS = ["Integradas", "Separadas", "Não possui"] as const;
export const COZINHA_OPTIONS = ["Individual", "Integrada", "Americana"] as const;
export const COBERTURA_VAGA_OPTIONS = ["Sem cobertura", "Coberta fixa", "Coberta rotativa", "Descoberta"] as const;
export const PERIODICIDADE_OPTIONS = ["Mensal", "Anual"] as const;
export const PLANEJADOS_OPTIONS = [
  "Dormitórios",
  "Banheiros",
  "Sala de estar",
  "Cozinha",
  "Área de serviço",
  "Área gourmet",
  "Escritório",
  "Hall de entrada",
] as const;

const req = (msg = "Campo obrigatório") => z.string().trim().min(1, msg);
const opt = z.string().trim().optional().or(z.literal(""));
const optNum = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === "" || v === undefined || v === null ? undefined : Number(v)))
  .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), "Valor inválido");

export const addressSchema = z.object({
  cep: req("Informe o CEP").regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  logradouro: req("Informe o logradouro").max(200),
  numero: req("Nº").max(20),
  complemento: opt,
  bairro: req("Informe o bairro").max(120),
  cidade: req("Informe a cidade").max(120),
  uf: z.enum(UF_OPTIONS, { errorMap: () => ({ message: "UF" }) }),
});

export const ownerSchema = z.object({
  nome: req("Informe o nome completo").min(3, "Nome muito curto").max(150),
  rg: req("Informe o RG").max(30),
  cpf: req("Informe o CPF").regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "CPF inválido"),
  dataNascimento: req("Informe a data de nascimento"),
  estadoCivil: z.enum(ESTADO_CIVIL_OPTIONS, { errorMap: () => ({ message: "Selecione" }) }),
  nacionalidade: req("Informe a nacionalidade").max(60),
  profissao: req("Informe a profissão").max(80),
  endereco: addressSchema,
  email: z.string().trim().email("E-mail inválido").max(150),
  telefone: req("Informe o telefone/WhatsApp").regex(/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/, "Telefone inválido"),
});

export const propertySchema = z.object({
  codigo: opt,
  captador: opt,
  endereco: addressSchema,
  tipo: z.enum(TIPO_IMOVEL_OPTIONS, { errorMap: () => ({ message: "Selecione o tipo" }) }),
  estado: z.enum(ESTADO_IMOVEL_OPTIONS, { errorMap: () => ({ message: "Selecione" }) }),
  previsaoEntrega: opt,
  matricula: opt,
  numeroIptu: opt,
  dormitorios: optNum,
  suites: optNum,
  banheiros: optNum,
  lavabos: optNum,
  salaEstar: optNum,
  salaJantar: optNum,
  salas: z.enum(SALAS_OPTIONS).optional(),
  cozinha: z.enum(COZINHA_OPTIONS).optional(),
  cozinhaObs: opt,
  areaServico: z.boolean().default(false),
  deposito: z.boolean().default(false),
  planejados: z.array(z.enum(PLANEJADOS_OPTIONS)).default([]),
  vagas: optNum,
  coberturaVaga: z.enum(COBERTURA_VAGA_OPTIONS).optional(),
  frente: optNum,
  ladoDireito: optNum,
  ladoEsquerdo: optNum,
  fundos: optNum,
  areaTerreno: optNum,
  areaConstruida: optNum,
  areaUtil: optNum,
  chavesLocal: opt,
  chavesNome: opt,
  chavesTelefone: opt,
  valorCondominio: optNum,
  valorIptu: optNum,
  periodicidadeIptu: z.enum(PERIODICIDADE_OPTIONS).optional(),
  documentacaoOk: z.boolean().default(false),
  averbado: z.boolean().default(false),
  emNomeTerceiro: z.boolean().default(false),
  nomeTerceiro: opt,
});

export const conditionsSchema = z
  .object({
    autorizaVenda: z.boolean().default(true),
    valorVenda: optNum,
    autorizaLocacao: z.boolean().default(false),
    valorLocacao: optNum,
    administracao: z.boolean().default(false),
    exclusividade: z.boolean().default(false),
    aceitaPermuta: z.boolean().default(false),
    permutaDescricao: opt,
    honorariosVenda: req("Informe os honorários de venda").max(300),
    honorariosLocacao: req("Informe os honorários de locação").max(300),
    observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((v) => v.autorizaVenda || v.autorizaLocacao, {
    message: "Autorize ao menos venda ou locação",
    path: ["autorizaVenda"],
  })
  .refine((v) => !v.autorizaVenda || (v.valorVenda !== undefined && v.valorVenda > 0), {
    message: "Informe o valor de venda",
    path: ["valorVenda"],
  })
  .refine((v) => !v.autorizaLocacao || (v.valorLocacao !== undefined && v.valorLocacao > 0), {
    message: "Informe o valor de locação",
    path: ["valorLocacao"],
  });

export type Address = z.infer<typeof addressSchema>;
export type OwnerData = z.infer<typeof ownerSchema>;
export type PropertyData = z.infer<typeof propertySchema>;
export type ConditionsData = z.infer<typeof conditionsSchema>;

export type OwnerInput = z.input<typeof ownerSchema>;
export type PropertyInput = z.input<typeof propertySchema>;
export type ConditionsInput = z.input<typeof conditionsSchema>;

export const DEFAULT_HONORARIOS_VENDA = "6% do valor da venda (conforme tabela do CRECI)";
export const DEFAULT_HONORARIOS_LOCACAO =
  "Primeiro aluguel + taxa de administração de 10% dos aluguéis subsequentes (quando houver administração da Vetorial)";

export const emptyAddress: Address = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "SP",
};

export const ownerDefaults: OwnerInput = {
  nome: "",
  rg: "",
  cpf: "",
  dataNascimento: "",
  estadoCivil: "Solteiro(a)",
  nacionalidade: "Brasileira",
  profissao: "",
  endereco: { ...emptyAddress },
  email: "",
  telefone: "",
};

export const propertyDefaults: PropertyInput = {
  codigo: "",
  captador: "",
  endereco: { ...emptyAddress, cidade: "Caraguatatuba" },
  tipo: "Casa",
  estado: "Usado",
  previsaoEntrega: "",
  matricula: "",
  numeroIptu: "",
  dormitorios: "",
  suites: "",
  banheiros: "",
  lavabos: "",
  salaEstar: "",
  salaJantar: "",
  salas: undefined,
  cozinha: undefined,
  cozinhaObs: "",
  areaServico: false,
  deposito: false,
  planejados: [],
  vagas: "",
  coberturaVaga: undefined,
  frente: "",
  ladoDireito: "",
  ladoEsquerdo: "",
  fundos: "",
  areaTerreno: "",
  areaConstruida: "",
  areaUtil: "",
  chavesLocal: "",
  chavesNome: "",
  chavesTelefone: "",
  valorCondominio: "",
  valorIptu: "",
  periodicidadeIptu: "Anual",
  documentacaoOk: false,
  averbado: false,
  emNomeTerceiro: false,
  nomeTerceiro: "",
};

export const conditionsDefaults: ConditionsInput = {
  autorizaVenda: true,
  valorVenda: "",
  autorizaLocacao: false,
  valorLocacao: "",
  administracao: false,
  exclusividade: false,
  aceitaPermuta: false,
  permutaDescricao: "",
  honorariosVenda: DEFAULT_HONORARIOS_VENDA,
  honorariosLocacao: DEFAULT_HONORARIOS_LOCACAO,
  observacoes: "",
};

export const COMPANY = {
  name: "VETORIAL IMÓVEIS E ARQUITETURA",
  creci: "30038-J",
  address: "Av. Ver. Aristides Anízio dos Santos, 40 - Indaiá, Caraguatatuba-SP",
  phone: "(12) 3882-5888",
  site: "www.vetorialimoveisearquitetura.com",
  city: "Caraguatatuba",
};
