import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LOGO_URL } from "@/components/brand/Logo";
import { COMPANY, type ConditionsData, type OwnerData, type PropertyData } from "@/lib/schemas";
import { formatDateTimeBR, formatLongDateBR } from "@/lib/format";
import {
  authorizationText,
  buildConditionsRows,
  buildOwnerRows,
  buildPropertyRows,
} from "./FichaDocument";

export type FichaPdfProps = {
  owner: OwnerData;
  property: PropertyData;
  conditions: ConditionsData;
  createdAt: string;
  brokerName?: string | null;
  brokerCreci?: string | null;
  logoDataUrl?: string | null;
  selfieDataUrl?: string | null;
  signatureDataUrl?: string | null;
  meta?: {
    signedAt: string;
    ip: string | null;
    userAgent: string | null;
    latitude: number | null;
    longitude: number | null;
    validationHash: string;
  } | null;
};

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 44, paddingHorizontal: 32, fontSize: 9, color: "#0f172a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  logo: { width: 120, objectFit: "contain" },
  headerRight: { textAlign: "right" },
  title: { fontSize: 13, fontWeight: 700 },
  muted: { color: "#64748b", fontSize: 7.5 },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitleBadge: {
    backgroundColor: "#ea580c",
    color: "#ffffff",
    width: 16,
    height: 16,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 700,
    marginRight: 6,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
  },
  rows: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  cell: { width: "50%", paddingRight: 10, marginBottom: 8 },
  cellWide: { width: "100%", paddingRight: 10, marginBottom: 8 },
  label: {
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 2,
  },
  value: { fontSize: 9, color: "#0f172a" },
  termContainer: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fed7aa", // orange-200
    backgroundColor: "#fff7ed", // orange-50
    borderRadius: 4,
  },
  termTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#ea580c",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  termText: {
    lineHeight: 1.5,
    fontSize: 8.5,
    color: "#0f172a",
  },
  imagesRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  imageBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  selfie: { height: 160, objectFit: "cover", borderRadius: 2 },
  signature: { height: 90, objectFit: "contain" },
  certBox: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
  },
  certTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#16a34a",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  seal: {
    marginTop: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    fontSize: 7.5,
    fontWeight: 700,
    textAlign: "center",
    borderRadius: 4,
  },
  hash: { fontSize: 7, fontFamily: "Courier", color: "#64748b", marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#64748b",
    textAlign: "center",
  },
});

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <View style={s.sectionTitleContainer}>
      <View style={s.sectionTitleBadge}>
        <Text>{number}</Text>
      </View>
      <Text style={s.sectionTitleText}>{title}</Text>
    </View>
  );
}

function Rows({ rows }: { rows: { label: string; value: unknown; wide?: boolean }[] }) {
  return (
    <View style={s.rows}>
      {rows.map((r) => (
        <View key={r.label} style={r.wide ? s.cellWide : s.cell}>
          <Text style={s.label}>{r.label}</Text>
          <Text style={s.value}>
            {typeof r.value === "string" || typeof r.value === "number" ? String(r.value) : "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function FichaPdf(props: FichaPdfProps) {
  const { owner, property, conditions, meta } = props;
  const logoSrc =
    props.logoDataUrl ||
    (typeof window !== "undefined" ? `${window.location.origin}${LOGO_URL}` : LOGO_URL);

  return (
    <Document title={`Autorização de Comercialização — ${owner.nome}`} author={COMPANY.name}>
      <Page size="A4" style={s.page} wrap>
        <View style={s.header}>
          <Image src={logoSrc} style={s.logo} />
          <View style={s.headerRight}>
            <Text style={s.title}>Autorização de Comercialização</Text>
            <Text style={s.muted}>
              {COMPANY.name} • CRECI {COMPANY.creci}
            </Text>
            <Text style={s.muted}>{COMPANY.address}</Text>
            <Text style={s.muted}>Emitida em {formatDateTimeBR(props.createdAt)}</Text>
          </View>
        </View>

        <SectionTitle number="1" title="Proprietário" />
        <Rows rows={buildOwnerRows(owner)} />

        <SectionTitle number="2" title="Imóvel" />
        <Rows rows={buildPropertyRows(property)} />

        <SectionTitle number="3" title="Condições de comercialização" />
        <Rows rows={buildConditionsRows(conditions)} />

        <View style={s.termContainer} wrap={false}>
          <Text style={s.termTitle}>Termo de Autorização</Text>
          <Text style={s.termText}>{authorizationText(owner, property, conditions)}</Text>
          <Text style={[s.termText, { marginTop: 6, fontWeight: 700 }]}>
            {COMPANY.city}, {formatLongDateBR(meta?.signedAt || props.createdAt)}
            {props.brokerName ? ` • Captação: ${props.brokerName}` : ""}
            {props.brokerCreci ? ` (CRECI ${props.brokerCreci})` : ""}
          </Text>
        </View>

        {meta && (
          <View wrap={false}>
            <SectionTitle number="4" title="Certificado de Assinatura Digital" />
            {(props.selfieDataUrl || props.signatureDataUrl) && (
              <View style={s.imagesRow}>
                {props.selfieDataUrl ? (
                  <View style={s.imageBox}>
                    <Image src={props.selfieDataUrl} style={s.selfie} />
                    <Text style={s.muted}>Selfie do proprietário com documento</Text>
                  </View>
                ) : null}
                {props.signatureDataUrl ? (
                  <View style={s.imageBox}>
                    <Image src={props.signatureDataUrl} style={s.signature} />
                    <Text style={s.muted}>Assinatura de {owner.nome}</Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={s.certBox}>
              <Text style={s.certTitle}>Metadados de validação</Text>
              <Rows
                rows={[
                  {
                    label: "Assinado em (horário de Brasília)",
                    value: formatDateTimeBR(meta.signedAt),
                  },
                  { label: "Endereço IP", value: meta.ip ?? "—" },
                  {
                    label: "Coordenadas GPS",
                    value:
                      meta.latitude != null && meta.longitude != null
                        ? `${meta.latitude.toFixed(6)}, ${meta.longitude.toFixed(6)}`
                        : "Não informadas",
                  },
                  { label: "CPF do signatário", value: owner.cpf },
                  { label: "Dispositivo / Navegador", value: meta.userAgent ?? "—", wide: true },
                  {
                    label: "Corretor responsável pela emissão",
                    value: props.brokerName
                      ? `${props.brokerName}${props.brokerCreci ? ` — CRECI ${props.brokerCreci}` : ""}`
                      : "—",
                    wide: true,
                  },
                ]}
              />
              <Text style={s.label}>Hash de validação (SHA-256)</Text>
              <Text style={s.hash}>{meta.validationHash}</Text>
              <Text style={s.seal}>Assinatura Eletrônica em conformidade com a Lei nº 14.063</Text>
              <Text style={{ ...s.muted, marginTop: 6 }}>
                Documento assinado eletronicamente. A integridade pode ser verificada junto à{" "}
                {COMPANY.name} pelo hash acima, que vincula os dados desta ficha, a selfie, a
                assinatura e o instante da assinatura.
              </Text>
            </View>
          </View>
        )}

        <Text style={s.footer} fixed>
          {COMPANY.name} • CRECI {COMPANY.creci} • {COMPANY.phone} • {COMPANY.site}
        </Text>
      </Page>
    </Document>
  );
}
