import type { Address, ConditionsData, OwnerData, PropertyData } from "./schemas";

export const formatCurrency = (v?: number | null) =>
  v === undefined || v === null || Number.isNaN(v)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const formatNumber = (v?: number | null, suffix = "") =>
  v === undefined || v === null || Number.isNaN(v) ? "—" : `${new Intl.NumberFormat("pt-BR").format(v)}${suffix}`;

export const formatDateBR = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = (iso.split("T")[0] ?? "").split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export const formatDateTimeBR = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(iso))
    : "—";

export const formatLongDateBR = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

export const maskCPF = (v: string) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const maskCEP = (v: string) => onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

export const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

export const formatAddress = (a?: Partial<Address> | null) => {
  if (!a) return "—";
  const parts = [
    [a.logradouro, a.numero].filter(Boolean).join(", "),
    a.complemento,
    a.bairro,
    [a.cidade, a.uf].filter(Boolean).join(" - "),
    a.cep ? `CEP ${a.cep}` : "",
  ].filter(Boolean);
  return parts.join(" • ");
};

export const shortAddress = (a?: Partial<Address> | null) =>
  a ? [[a.logradouro, a.numero].filter(Boolean).join(", "), a.bairro, a.cidade].filter(Boolean).join(" - ") : "—";

export const yesNo = (v?: boolean | null) => (v ? "Sim" : "Não");

export const whatsappLink = (phone: string, message: string) => {
  const digits = onlyDigits(phone);
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

export const buildWhatsappMessage = (opts: {
  ownerName: string;
  brokerName?: string | null;
  brokerCreci?: string | null;
  propertyAddress: string;
  link: string;
}) => {
  const firstName = opts.ownerName.trim().split(" ")[0] || opts.ownerName;
  return [
    `Olá, ${firstName}! Tudo bem?`,
    ``,
    `Aqui é ${opts.brokerName ? `${opts.brokerName}, ` : ""}da *Vetorial Imóveis e Arquitetura*${opts.brokerCreci ? ` (CRECI ${opts.brokerCreci})` : ""}.`,
    ``,
    `Preparei a *Autorização de Comercialização* do seu imóvel:`,
    `📍 ${opts.propertyAddress}`,
    ``,
    `Para concluir, basta acessar o link abaixo, conferir os dados, tirar uma selfie segurando seu documento e assinar digitalmente na tela. Leva menos de 3 minutos:`,
    `🔗 ${opts.link}`,
    ``,
    `Após a assinatura, você receberá o PDF com o certificado de validação.`,
    ``,
    `Qualquer dúvida, estou à disposição. Obrigado pela confiança! 🙏`,
  ].join("\n");
};

export type AuthorizationRecord = {
  id: string;
  token: string;
  status: "pendente" | "assinado";
  owner: OwnerData;
  property: PropertyData;
  conditions: ConditionsData;
  property_code: string | null;
  broker_id: string;
  created_at: string;
  updated_at: string;
};

export type SignatureRecord = {
  id: string;
  authorization_id: string;
  signed_at: string;
  ip: string | null;
  user_agent: string | null;
  latitude: number | null;
  longitude: number | null;
  validation_hash: string;
  pdf_path: string | null;
  selfie_path: string;
  signature_path: string;
};
