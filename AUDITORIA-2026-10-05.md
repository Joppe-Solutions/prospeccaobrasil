# Terceira auditoria — Prospecção Brasil (sistema interno)

Data: 05/10/2026 · Escopo: `sistema/api` e `sistema/frontend`, deploy e repositório.
Não cobre: a landing, a VPS em si (não acessei o servidor) e os relatórios de inteligência de mercado em profundidade.

## Situação após as correções (05/10/2026)

| Achado | Situação |
|---|---|
| C01 produção fora do git | Corrigido: tudo commitado; deploy pelo pipeline a partir do `main` |
| C02 comercial exclui cadastros | Corrigido: excluir imóvel, empresa, proprietário, parceiro, lead e operação exige admin |
| C03 API pública expõe dados internos | Corrigido: lista explícita de campos. O id sequencial continua |
| C04 link `javascript:` | Corrigido: documentos e links do imóvel só aceitam http(s) |
| C05 token de sessão na URL | Corrigido: links usam token de arquivo de 10 min, só leitura; sessão na URL é recusada |
| C06 troca de senha não derruba sessões | Corrigido (troca pelo usuário e redefinição pelo admin) |
| C08 imóvel aceita qualquer valor | Corrigido: enums, números ≥ 0, obrigatórios e links validados na criação e na edição |
| C09 perfil sem validação / admin se tranca | Corrigido: perfil validado; sempre resta um admin ativo |
| C10 erro 500 para registro inexistente | Corrigido: 404 (e 409 para vínculo que impede exclusão) |
| C11 operação duplicada | Corrigido na API (409). Sem índice único no banco, para não falhar em dados já duplicados |
| C14 CORS aberto | Corrigido: só os domínios da Prospecção Brasil e localhost. CSP continua pendente |
| C15 multer descontinuado | Corrigido: multer 2.x. O alerta do Prisma CLI continua |
| C20 rate limit sem limpeza | Corrigido |
| C07, C12, C13, C16–C19, C21–C26 | Pendentes |

## Como foi feita

- Leitura do código das rotas, schema, deploy e CI.
- Suíte da API: 38 testes, todos passando (inclui o teste novo de diretrizes).
- Lint do frontend: sem erros.
- Sondagem automática contra a API em banco temporário: cada achado marcado **[confirmado]** foi reproduzido com uma requisição real; os demais vêm de leitura de código.
- `npm audit` nas dependências de produção.
- Não rodei a suíte e2e (Playwright) nesta rodada.

## Parecer

O sistema está funcional e os problemas graves das duas auditorias anteriores (documentos privados, despesas, usuários desativados) continuam corrigidos. Os riscos atuais se concentram em três pontos:

1. **Permissões**: só existe a distinção admin/comercial no financeiro. Fora dele, qualquer usuário logado apaga imóveis e operações.
2. **Validação**: os módulos antigos (imóveis, usuários) aceitam quase qualquer valor; os novos (demandas) validam bem. O padrão é inconsistente.
3. **Processo**: produção está rodando código que não está no git.

## Achados

### P1 — corrigir primeiro

**C01 — Produção não corresponde ao git.**
Há 48 arquivos modificados ou novos sem commit (todo o módulo de demandas, propostas, glossário, benchmarks e a migration `20261005150000_demandas_glossario`), e `/diretrizes` já estava no ar. O deploy foi feito pelo script a partir da máquina local. Se o disco falhar ou outro deploy sair do `main`, esse trabalho se perde ou a produção regride com o banco já migrado.
*Correção:* commitar agora; deploy só a partir de commit (o script pode recusar árvore suja).

**C02 — Usuário comercial apaga imóveis e operações. [confirmado]**
`DELETE /api/imoveis/:id` e `DELETE /api/oportunidades/:id` retornam 200 para o papel `comercial`. O mesmo vale para empresas, proprietários e parceiros (só exigem login).
*Correção:* exclusões restritas a admin; para o comercial, arquivar (status inativo).

**C03 — API pública do imóvel expõe dados internos. [confirmado]**
`GET /api/public/imoveis/:id` (sem login) devolve `luvas`, `valorPonto`, `restricoesUso`, `infraestrutura`, `proprietarioId`, `parceiroId` e a análise de mercado completa. A rota remove cinco campos e devolve o resto, então todo campo novo no modelo vaza por padrão. Como o id é sequencial, dá para percorrer o portfólio inteiro, inclusive imóveis locados e vendidos.
*Correção:* lista explícita de campos permitidos; avaliar trocar o id por um código de compartilhamento não adivinhável.

**C04 — Link `javascript:` aceito em documento de imóvel. [confirmado]**
`POST /api/imoveis/:id/documentos` grava `url: "javascript:alert(1)"` e a tela do imóvel renderiza como `href` ([ImovelDetalhe.jsx:225](sistema/frontend/src/pages/ImovelDetalhe.jsx:225)). Um usuário comercial consegue executar script na sessão de um admin que clicar. A rota de documentos de demanda já valida isso; a de imóvel não. A apresentação pública está protegida (`safeUrl`).
*Correção:* mesma validação http/https da demanda.

**C05 — Token de sessão na URL.**
Documentos privados, comprovantes e o relatório de inteligência são abertos com `?token=<JWT>`. O token (válido por 12h) fica em log do Nginx, histórico do navegador e cabeçalho Referer.
*Correção:* link assinado de curta duração só para aquele arquivo, ou baixar via `fetch` com cabeçalho e abrir como blob.

**C06 — Trocar a senha não derruba sessões. [confirmado]**
Depois de `trocar-senha`, o token antigo continua válido até expirar. Se uma senha vazar, trocá-la não expulsa o invasor.
*Correção:* guardar `senhaAlteradaEm` no usuário e recusar tokens emitidos antes.

**C07 — Deploy por senha de root.**
`scripts/deploy-prod.sh` usa `root` com senha via `sshpass` e desativa a chave pública explicitamente, embora o `AGENTS.md` diga que a chave ed25519 já está configurada.
*Correção:* usar a chave, desativar login por senha no SSH, usuário de deploy sem root.

### P2 — importantes

**C08 — Imóvel aceita qualquer valor na edição. [confirmado]**
`PUT /api/imoveis/:id` aceita `status: "qualquer"`, `tipo: "permuta"`, área e aluguel negativos, `areaTotal: "abc"` e endereço/cidade vazios (todos 200). Um status inventado some dos filtros e dos contadores do painel.
*Correção:* validar enums, números ≥ 0 e obrigatórios também na edição.

**C09 — Papel de usuário sem validação; admin pode se trancar para fora. [confirmado]**
`PUT /api/usuarios/:id` aceita `role: "superuser"`. O admin consegue rebaixar a si mesmo e perde o acesso a Usuários na hora; se for o único admin, só se resolve direto no banco.
*Correção:* validar `admin|comercial`; impedir rebaixar/desativar a si mesmo e o último admin.

**C10 — Registro inexistente devolve erro 500. [confirmado]**
`PUT /api/imoveis/999999`, `PUT /api/usuarios/99999`, `DELETE /api/oportunidades/99999` e `POST /api/imoveis/999999/documentos` retornam 500 em vez de 404. No upload de foto para imóvel inexistente o arquivo ainda fica órfão no disco.
*Correção:* tratar `P2025`/`P2003` do Prisma no handler de erro global.

**C11 — Operação duplicada para o mesmo imóvel e demanda. [confirmado]**
Dois `POST /api/oportunidades` idênticos criam duas operações. O painel novo de diretrizes esconde o botão depois da primeira apresentação, mas a API e a tela de Relacionamentos não impedem.
*Correção:* índice único (imóvel, demanda) ou verificação na criação.

**C12 — Comercial vê contratos e honorários. [confirmado]**
O financeiro é restrito a admin, mas o comercial lista contratos de demandas (`/api/documentos/demandas`) e honorários das propostas (`/api/propostas`). Pode ser intencional; hoje é inconsistente com a regra dos documentos de imóvel.
*Decisão do Luiz:* o comercial deve ver honorários e contratos?

**C13 — Demandas e propostas não podem ser excluídas nem arquivadas.**
Não há rota de exclusão. Cadastro errado fica para sempre (dá para marcar a demanda como cancelada, mas a proposta não tem equivalente).

**C14 — CORS aberto e sem política de conteúdo.**
`cors()` sem restrição de origem e nenhum cabeçalho CSP. Como o token fica em `localStorage`, qualquer XSS (ver C04) rouba a sessão.
*Correção:* restringir origem aos dois domínios; adicionar `helmet` com CSP.

**C15 — Dependência com alerta alto.**
`npm audit` aponta `deepmerge-ts` (via `prisma` CLI 6.19.3), severidade alta. É ferramenta de migração, não roda atendendo requisições, então o risco prático é baixo. `multer 1.4.5-lts` está descontinuado; a linha 2.x corrige falhas de negação de serviço em upload.
*Correção:* atualizar multer para 2.x; acompanhar correção do Prisma.

**C16 — CI de pull request não roda.**
O `AGENTS.md` registra que a cobrança do GitHub está bloqueada e os jobs falham sem executar. O único gate é o do deploy, que o script manual nem sempre percorre (ele roda testes da API e lint, mas não o e2e).

### P3 — qualidade e manutenção

**C17 — Código novo em linhas únicas.**
67 linhas com mais de 400 caracteres em rotas e páginas. `demandas.js`, `oportunidades.js`, `propostas.js`, `Demandas.jsx`, `DemandaDetalhe.jsx` e todo o `collections.css` (uma linha só) são praticamente ilegíveis e geram diffs inúteis. Os módulos antigos (`imoveis.js`, `financeiro.js`) estão bem formatados.
*Correção:* adotar Prettier e formatar tudo num commit isolado.

**C18 — Datas guardadas como texto.**
`inicioEm` e `proximaAcaoEm` em demandas e operações são `String`. Não dá para ordenar, filtrar "vencidas" ou montar agenda no banco. Em leads o mesmo campo é `DateTime`.

**C19 — Validação reescrita em cada rota.**
Cada arquivo tem seu próprio `pick`/`num`/regex de data. É a causa direta de C04, C08 e C09: a regra existe num módulo e falta no outro.
*Correção:* um esquema por entidade (zod, por exemplo) usado em criação e edição.

**C20 — Rate limit em memória sem limpeza.**
Os mapas de tentativas de login e de leads nunca removem IPs antigos e zeram a cada reinício.

**C21 — `uncaughtException` é engolida.**
O processo registra o erro e continua rodando em estado indefinido. O correto é registrar e sair, deixando o systemd reiniciar.

**C22 — Listagens carregam tudo.**
A API já pagina, mas as telas pedem a lista inteira e paginam no navegador. `GET /api/demandas` traz ainda todas as operações, documentos, atividades e propostas de cada demanda. Com poucas centenas de registros funciona; não escala.

**C23 — Pacote único de 567 KB no frontend.**
Sem divisão por rota. Carregar as páginas sob demanda (`React.lazy`) reduz a carga inicial.

**C24 — Frontend sem testes unitários e sem tipos.**
A cobertura é só e2e. Regras como a de compatibilidade ficaram no backend justamente para serem testáveis.

**C25 — Backup no mesmo servidor.**
O backup diário e o snapshot de deploy ficam na própria VPS. Se a máquina se perder, vão juntos. Não verifiquei se existe cópia externa; o repositório não documenta nenhuma.

**C26 — SQLite.**
Decisão registrada e adequada ao porte atual. Fica o registro de que relatórios financeiros com `Decimal` em SQLite e uso concorrente por mais usuários são os sinais para migrar para Postgres.

## O que eu teria feito diferente

- **Permissões por ação desde o início**, em vez de um único `requireRole('admin')` no financeiro. Uma tabela simples "papel × ação" resolvida num middleware.
- **Um esquema de validação por entidade**, compartilhado entre criar e editar.
- **Resposta pública montada por lista de campos permitidos**, nunca por remoção.
- **Compatibilidade imóvel × demanda como parte do modelo** (feito agora), com região estruturada: hoje `regioesInteresse` é texto livre, então "Zona Sul" não casa com um imóvel em Copacabana. Uma lista de bairros/cidades por demanda tornaria o cruzamento confiável.
- **Deploy só pelo pipeline**, a partir de commit, com o gate completo.

## Ordem sugerida

1. C01 (commit) e C02, C04 (uma tarde de trabalho, risco imediato).
2. C03, C05, C06, C07 (exposição de dados e acesso).
3. C08–C11 junto com C19 (validação unificada resolve os quatro).
4. C12–C13 após decisão do Luiz.
5. C17 num commit isolado, depois o restante do P3.
