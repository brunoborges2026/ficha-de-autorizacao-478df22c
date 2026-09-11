import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { COMPANY, type ConditionsData, type OwnerData, type PropertyData } from "@/lib/schemas";
import {
  formatAddress,
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatNumber,
  yesNo,
} from "@/lib/format";
import type { PublicSignature } from "@/lib/signing.functions";
import { cn } from "@/lib/utils";

export type FichaData = {
  owner: OwnerData;
  property: PropertyData;
  conditions: ConditionsData;
  created_at: string;
  broker_name?: string | null;
  broker_creci?: string | null;
};

export const LEI_14063_LABEL = "Assinatura Eletrônica em conformidade com a Lei nº 14.063";

/** Compliance seal shown on the signing screen and inside the digital signature certificate. */
export function ComplianceBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-secondary/25 bg-secondary/5 px-3 py-1.5 text-[11px] font-semibold leading-tight text-secondary",
        className,
      )}
    >
      <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
      {LEI_14063_LABEL}
    </span>
  );
}

export type Row = { label: string; value: ReactNode; wide?: boolean };

const val = (v?: string | number | null) =>
  v === undefined || v === null || v === "" ? "—" : String(v);

export function buildOwnerRows(o: OwnerData): Row[] {
  return [
    { label: "Nome completo", value: o.nome, wide: true },
    { label: "RG", value: o.rg },
    { label: "CPF", value: o.cpf },
    { label: "Data de nascimento", value: formatDateBR(o.dataNascimento) },
    { label: "Estado civil", value: o.estadoCivil },
    { label: "Nacionalidade", value: o.nacionalidade },
    { label: "Profissão", value: o.profissao },
    { label: "Endereço", value: formatAddress(o.endereco), wide: true },
    { label: "E-mail", value: o.email },
    { label: "Telefone / WhatsApp", value: o.telefone },
  ];
}

export function buildPropertyRows(p: PropertyData): Row[] {
  const planejados = p.planejados?.length ? p.planejados.join(", ") : "Não possui";
  return [
    { label: "Código do imóvel", value: val(p.codigo) },
    { label: "Captador", value: val(p.captador) },
    { label: "Endereço do imóvel", value: formatAddress(p.endereco), wide: true },
    { label: "Tipo", value: p.tipo },
    {
      label: "Estado",
      value:
        p.estado === "Em construção" && p.previsaoEntrega
          ? `${p.estado} (previsão ${p.previsaoEntrega})`
          : p.estado,
    },
    { label: "Matrícula", value: val(p.matricula) },
    { label: "Nº IPTU", value: val(p.numeroIptu) },
    {
      label: "Dormitórios / Suítes",
      value: `${formatNumber(p.dormitorios)} / ${formatNumber(p.suites)}`,
    },
    {
      label: "Banheiros / Lavabos",
      value: `${formatNumber(p.banheiros)} / ${formatNumber(p.lavabos)}`,
    },
    {
      label: "Salas (estar / jantar)",
      value: `${formatNumber(p.salaEstar)} / ${formatNumber(p.salaJantar)}${p.salas ? ` • ${p.salas}` : ""}`,
    },
    { label: "Cozinha", value: [p.cozinha, p.cozinhaObs].filter(Boolean).join(" — ") || "—" },
    { label: "Área de serviço", value: yesNo(p.areaServico) },
    { label: "Depósito / Hobby box", value: yesNo(p.deposito) },
    { label: "Móveis planejados", value: planejados, wide: true },
    {
      label: "Vagas",
      value: `${formatNumber(p.vagas)}${p.coberturaVaga ? ` • ${p.coberturaVaga}` : ""}`,
    },
    {
      label: "Medidas do terreno",
      value: `Frente ${formatNumber(p.frente, " m")} • Lado dir. ${formatNumber(p.ladoDireito, " m")} • Lado esq. ${formatNumber(p.ladoEsquerdo, " m")} • Fundos ${formatNumber(p.fundos, " m")}`,
      wide: true,
    },
    { label: "Área do terreno", value: formatNumber(p.areaTerreno, " m²") },
    { label: "Área construída", value: formatNumber(p.areaConstruida, " m²") },
    { label: "Área útil", value: formatNumber(p.areaUtil, " m²") },
    {
      label: "Chaves",
      value: [p.chavesLocal, p.chavesNome, p.chavesTelefone].filter(Boolean).join(" • ") || "—",
      wide: true,
    },
    { label: "Condomínio", value: formatCurrency(p.valorCondominio) },
    {
      label: "IPTU",
      value:
        p.valorIptu !== undefined
          ? `${formatCurrency(p.valorIptu)}${p.periodicidadeIptu ? ` (${p.periodicidadeIptu})` : ""}`
          : "—",
    },
    { label: "Documentação OK / aceita financiamento", value: yesNo(p.documentacaoOk) },
    { label: "Averbado", value: yesNo(p.averbado) },
    {
      label: "Em nome de terceiro",
      value: p.emNomeTerceiro ? `Sim${p.nomeTerceiro ? ` — ${p.nomeTerceiro}` : ""}` : "Não",
    },
  ];
}

export function buildConditionsRows(c: ConditionsData): Row[] {
  return [
    { label: "Venda", value: c.autorizaVenda ? formatCurrency(c.valorVenda) : "Não autorizada" },
    {
      label: "Locação",
      value: c.autorizaLocacao ? formatCurrency(c.valorLocacao) : "Não autorizada",
    },
    { label: "Administração Vetorial", value: yesNo(c.administracao) },
    { label: "Exclusividade", value: yesNo(c.exclusividade) },
    {
      label: "Permuta",
      value: c.aceitaPermuta
        ? `Aceita${c.permutaDescricao ? ` — ${c.permutaDescricao}` : ""}`
        : "Não aceita",
      wide: true,
    },
    { label: "Honorários — Venda", value: c.honorariosVenda, wide: true },
    { label: "Honorários — Locação", value: c.honorariosLocacao, wide: true },
    ...(c.observacoes ? [{ label: "Observações", value: c.observacoes, wide: true }] : []),
  ];
}

export function authorizationText(o: OwnerData, p: PropertyData, c: ConditionsData) {
  const modos = [c.autorizaVenda && "VENDA", c.autorizaLocacao && "LOCAÇÃO"]
    .filter(Boolean)
    .join(" e ");
  return `Eu, ${o.nome}, ${o.nacionalidade.toLowerCase()}, ${o.estadoCivil.toLowerCase()}, ${o.profissao.toLowerCase()}, portador(a) do RG nº ${o.rg} e CPF nº ${o.cpf}, AUTORIZO a ${COMPANY.name}, inscrita no CRECI sob o nº ${COMPANY.creci}, com sede na ${COMPANY.address}, a promover a ${modos} do imóvel descrito nesta ficha, situado em ${formatAddress(p.endereco)}, nas condições aqui estabelecidas${c.exclusividade ? ", em regime de EXCLUSIVIDADE" : ""}. Autorizo ainda a divulgação do imóvel em portais, redes sociais, placas e demais meios de publicidade, bem como a visitação acompanhada por corretores credenciados. Declaro que as informações prestadas são verdadeiras e que sou legítimo(a) proprietário(a) ou representante legal do imóvel.`;
}

function RowsGrid({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className={cn("min-w-0", r.wide && "sm:col-span-2")}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {r.label}
          </dt>
          <dd className="break-words text-sm text-foreground">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DocSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-base font-bold text-secondary">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-xs text-primary-foreground">
          {number}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Read-only, document-styled rendering of a ficha (used by the broker detail page and the owner's page). */
export function FichaDocument({
  data,
  signature,
  className,
}: {
  data: FichaData;
  signature?: PublicSignature | null;
  className?: string;
}) {
  return (
    <article className={cn("rounded-lg border border-border bg-card shadow-sm", className)}>
      <header className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <Logo className="h-12" />
        <div className="sm:text-right">
          <h2 className="text-lg font-bold text-secondary">Autorização de Comercialização</h2>
          <p className="text-xs text-muted-foreground">
            {COMPANY.name} • CRECI {COMPANY.creci}
          </p>
          <p className="text-xs text-muted-foreground">
            Emitida em {formatDateTimeBR(data.created_at)}
          </p>
        </div>
      </header>

      <div className="space-y-8 p-5 sm:p-6">
        <DocSection number="1" title="Proprietário">
          <RowsGrid rows={buildOwnerRows(data.owner)} />
        </DocSection>
        <DocSection number="2" title="Imóvel">
          <RowsGrid rows={buildPropertyRows(data.property)} />
        </DocSection>
        <DocSection number="3" title="Condições de comercialização">
          <RowsGrid rows={buildConditionsRows(data.conditions)} />
        </DocSection>

        <section className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
            Termo de autorização
          </p>
          {authorizationText(data.owner, data.property, data.conditions)}
        </section>

        {signature && (
          <section className="space-y-4 rounded-md border border-success/30 bg-success/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-success">
              Certificado de assinatura digital
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {signature.selfie_url && (
                <figure>
                  <img
                    src={signature.selfie_url}
                    alt="Selfie do proprietário segurando o documento"
                    className="h-48 w-full rounded-md border border-border object-cover"
                  />
                  <figcaption className="mt-1 text-xs text-muted-foreground">
                    Selfie com documento
                  </figcaption>
                </figure>
              )}
              {signature.signature_url && (
                <figure>
                  <img
                    src={signature.signature_url}
                    alt="Assinatura digital"
                    className="h-48 w-full rounded-md border border-border bg-card object-contain p-2"
                  />
                  <figcaption className="mt-1 text-xs text-muted-foreground">Assinatura</figcaption>
                </figure>
              )}
            </div>
            <RowsGrid
              rows={[
                { label: "Assinado em (Brasília)", value: formatDateTimeBR(signature.signed_at) },
                { label: "Endereço IP", value: signature.ip ?? "—" },
                {
                  label: "Localização (GPS)",
                  value:
                    signature.latitude != null && signature.longitude != null
                      ? `${signature.latitude.toFixed(6)}, ${signature.longitude.toFixed(6)}`
                      : "Não informada",
                },
                {
                  label: "Dispositivo / Navegador",
                  value: signature.user_agent ?? "—",
                  wide: true,
                },
                {
                  label: "Hash de validação (SHA-256)",
                  value: (
                    <code className="break-all font-mono text-xs">{signature.validation_hash}</code>
                  ),
                  wide: true,
                },
              ]}
            />
          </section>
        )}
      </div>
    </article>
  );
}
