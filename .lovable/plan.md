# Vetorial — Autorização de Comercialização Digital

Aplicação web responsiva para corretores da Vetorial Imóveis e Arquitetura criarem fichas de autorização de comercialização, enviarem por WhatsApp ao proprietário e coletarem selfie + assinatura digital com certificado de metadados e PDF final.

## Identidade visual

- Logo Vetorial (enviada) no topo do sistema, na tela de login, na página pública do proprietário e no cabeçalho do PDF; também usada como favicon.
- Cores: laranja `#ea580c` (ações principais, foco, stepper ativo), slate navy `#0f172a` (sidebar/cabeçalhos escuros, botão "Gerar Ficha"), fundo `#f8fafc`, cards brancos com borda `#e2e8f0`.
- Tipografia: Plus Jakarta Sans (títulos) + Inter (campos e dados).
- Inputs/botões com raio 6px, cards 8px, sombras suaves.
- Desktop em grid de 12 colunas (RG/CPF na mesma linha etc.), tudo empilhado no mobile.

## Perfis e acesso

- **Admin**: dashboard geral (todas as fichas de todos os corretores) + tela "Usuários": cria corretor informando só o e-mail (recebe convite por e-mail), reseta senha, exclui usuário.
- **Corretor**: no primeiro acesso (via link do convite) é obrigado a definir uma senha segura antes de entrar; depois usa e-mail + senha.
- **Proprietário**: sem login; acessa apenas `/assinar/{token}`.
- Primeiro admin: o primeiro usuário cadastrado será promovido a admin (informe qual e-mail deve ser o admin inicial ao aprovar, ou eu configuro na entrega).

## Telas do corretor

1. **Login / Definir senha** (primeiro acesso) / Esqueci a senha.
2. **Dashboard**: cards de métricas (Total, Pendentes, Assinadas), tabela "Fichas Recentes" com Proprietário, Endereço do imóvel, Data, Status (badge Pendente/Assinado) e ações: Detalhes, Baixar PDF (só assinadas), Reenviar Link (WhatsApp).
3. **Nova Ficha — wizard 3 etapas** com stepper visual, salvamento de rascunho entre passos e validação por etapa:
   - **1. Proprietário**: nome, RG, CPF, data nasc., estado civil, nacionalidade, profissão, endereço completo (CEP com preenchimento automático via ViaCEP, logradouro, nº, comp., bairro, cidade, UF), e-mail, telefone/WhatsApp.
   - **2. Imóvel** (espelhando a ficha física): código do imóvel, captador (pré-preenchido com o corretor), endereço completo, tipo (Casa, Sobrado, Apartamento, Cobertura, Kitnet, Studio, Flat, Terreno, Área, Sala comercial, Galpão), estado (Novo/Usado/Em construção + previsão de entrega), matrícula, nº IPTU, distribuição (dormitórios, suítes, banheiros sociais, lavabos, salas estar/jantar integradas ou separadas, cozinha, área de serviço, depósito/hobby box, móveis planejados por ambiente, vagas e tipo de cobertura), metragens (frente/testada, lados, fundos, terreno, construída, útil), local das chaves (nome/telefone), condomínio e IPTU (valor e periodicidade), documentação OK/aceita financiamento, averbado, em nome de terceiro.
   - **3. Condições**: valor de venda, valor de locação (ou "não autorizado"), administração Vetorial (sim/não), exclusividade (sim/não), permuta (aceita? qual?), honorários (padrão: Venda 6% CRECI; Locação 1º aluguel + 10% admin — editável), observações.
4. **Sucesso**: link único gerado, botão copiar e botão verde "Enviar link via WhatsApp" (abre `wa.me/55…` com mensagem educada pré-formatada, incluindo o nome do proprietário, endereço do imóvel e o link).
5. **Detalhes da ficha**: leitura completa, status, dados de assinatura (quando assinada), botão baixar PDF e reenviar link.

## Tela do proprietário (`/assinar/{token}`, mobile first)

- Ao abrir: solicita permissão de Localização e Câmera com explicação amigável.
- Documento em modo leitura com todo o texto da autorização oficial (CRECI 30038-J, endereço da sede, cláusula de divulgação) e os dados das 3 etapas.
- **Selfie**: abrir câmera frontal e tirar foto segurando o documento (com pré-visualização e opção de repetir; fallback para upload de arquivo).
- **Assinatura**: canvas touch/mouse (`react-signature-canvas`) com botão "Refazer Assinatura".
- Checkbox "Li e concordo com os termos e confirmo a veracidade" + botão "Assinar e Enviar Documento".
- No envio, capturados em segundo plano: data/hora (America/Sao_Paulo), IP, User-Agent, latitude/longitude, e hash SHA-256 de validação (dados da ficha + assinatura + timestamp).
- Geração do PDF (logo, todas as seções, selfie, assinatura, rodapé "Certificado de Assinatura Digital" com metadados e hash) e salvamento no armazenamento.
- Tela de sucesso com botão "Baixar PDF".
- Acessos posteriores ao mesmo link mostram apenas o PDF finalizado (sem formulário).
- Status no dashboard do corretor muda para "Assinado" automaticamente (atualização em tempo real).

## Detalhes técnicos

- **Stack**: TanStack Start (React 19) + Tailwind v4, Lovable Cloud (auth, banco, storage), `react-hook-form` + `zod`, `react-signature-canvas`, `@react-pdf/renderer` para o PDF, `sonner` para toasts, shadcn/ui.
- **Banco**:
  - `profiles` (id, email, full_name, must_set_password, created_at) criada por trigger no cadastro.
  - `user_roles` (user_id, role enum admin/broker) + função `has_role` (security definer).
  - `authorizations` (id, broker_id, token único, status pendente/assinado, dados do proprietário, do imóvel e das condições em colunas jsonb tipadas, created_at).
  - `signatures` (authorization_id, selfie_path, signature_path, pdf_path, signed_at, ip, user_agent, latitude, longitude, validation_hash).
  - Grants + RLS: corretor lê/escreve só suas fichas; admin lê tudo; proprietário não acessa tabelas diretamente — toda a página pública passa por funções de servidor que validam o token.
- **Storage**: bucket privado `signatures` (selfies, assinaturas, PDFs); downloads via URLs assinadas geradas no servidor.
- **Funções de servidor** (`createServerFn`): `getAuthorizationByToken` (retorna só os dados necessários), `submitSignature` (valida token/status, grava imagens, captura IP do request, calcula hash, gera PDF, muda status), `inviteBroker`, `resetBrokerPassword`, `deleteBroker` (admin, usando cliente privilegiado após checar `has_role`).
- **Auth**: convite por e-mail via Auth Admin; callback do convite cai em `/definir-senha` que grava a senha e limpa `must_set_password`; recuperação de senha em `/reset-password`.
- **Rotas**: `/` (login ou redireciona), `/_authenticated/dashboard`, `/_authenticated/fichas/nova`, `/_authenticated/fichas/$id`, `/_authenticated/admin/usuarios`, `/definir-senha`, `/reset-password`, `/assinar/$token` (pública, SSR desativado para câmera/GPS).
- Metadados SEO por rota; página pública com `noindex`.

## Ordem de entrega

1. Ativar Lovable Cloud, esquema do banco, roles, storage, design system e logo.
2. Autenticação (login, primeiro acesso, reset) + gestão de usuários do admin.
3. Dashboard + wizard de 3 etapas + tela de sucesso/WhatsApp.
4. Página pública do proprietário (permissões, selfie, assinatura, metadados).
5. Geração de PDF, tela de sucesso, visualização pós-assinatura, tempo real no dashboard.
