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
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#ea580c",
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 12,
    marginBottom: 6,
  },
  rows: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", paddingRight: 8, marginBottom: 5 },
  cellWide: { width: "100%", paddingRight: 8, marginBottom: 5 },
  label: { fontSize: 6.5, color: "#64748b", textTransform: "uppercase" },
  value: { fontSize: 8.5 },
  term: {
    marginTop: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    lineHeight: 1.5,
    fontSize: 8.5,
  },
  imagesRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  imageBox: { width: "48%", borderWidth: 1, borderColor: "#e2e8f0", padding: 4 },
  selfie: { height: 150, objectFit: "cover" },
  signature: { height: 90, objectFit: "contain" },
  certBox: { marginTop: 12, padding: 8, borderWidth: 1, borderColor: "#0f172a" },
  certTitle: { fontSize: 9, fontWeight: 700, marginBottom: 6 },
  seal: {
    marginTop: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: "#0f172a",
    backgroundColor: "#f8fafc",
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
  },
  hash: { fontSize: 7, fontFamily: "Courier" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 6.5,
    color: "#64748b",
    textAlign: "center",
  },
});

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

        <Text style={s.sectionTitle}>1. Proprietário</Text>
        <Rows rows={buildOwnerRows(owner)} />

        <Text style={s.sectionTitle}>2. Imóvel</Text>
        <Rows rows={buildPropertyRows(property)} />

        <Text style={s.sectionTitle}>3. Condições de comercialização</Text>
        <Rows rows={buildConditionsRows(conditions)} />

        <View style={s.term}>
          <Text>{authorizationText(owner, property, conditions)}</Text>
          <Text style={{ marginTop: 6 }}>
            {COMPANY.city}, {formatLongDateBR(meta?.signedAt || props.createdAt)}
            {props.brokerName ? ` • Captação: ${props.brokerName}` : ""}
          </Text>
        </View>

        {meta && (
          <>
            <Text style={s.sectionTitle} break>
              4. Certificado de Assinatura Digital
            </Text>
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
                ]}
              />
              <Text style={s.label}>Hash de validação (SHA-256)</Text>
              <Text style={s.hash}>{meta.validationHash}</Text>
              <Text style={{ ...s.muted, marginTop: 6 }}>
                Documento assinado eletronicamente. A integridade pode ser verificada junto à{" "}
                {COMPANY.name} pelo hash acima, que vincula os dados desta ficha, a selfie, a
                assinatura e o instante da assinatura.
              </Text>
            </View>
          </>
        )}

        <Text style={s.footer} fixed>
          {COMPANY.name} • CRECI {COMPANY.creci} • {COMPANY.phone} • {COMPANY.site}
        </Text>
      </Page>
    </Document>
  );
}
