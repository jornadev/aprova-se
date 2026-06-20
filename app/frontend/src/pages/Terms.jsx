import { Link } from 'react-router-dom'

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#94a3b8', lineHeight: 1.75 }}>{children}</div>
    </div>
  )
}

export default function Terms() {
  return (
    <div style={{ background: '#070b14', minHeight: '100vh', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <Link to="/" style={{ color: '#7c3aed', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
          &larr; Voltar
        </Link>

        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', margin: '24px 0 8px' }}>
          Termos de Uso e Política de Privacidade
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 40 }}>
          Última atualização: junho de 2026
        </p>

        <Section title="1. Aceitação dos Termos">
          Ao se cadastrar na plataforma Aprova.se, você declara ter lido, compreendido e aceito integralmente estes Termos de Uso e a Política de Privacidade. Se você não concordar com qualquer disposição, não deverá usar a plataforma.
        </Section>

        <Section title="2. Uso Adequado da Plataforma">
          A Aprova.se é uma plataforma de organização de estudos para concursos públicos. O usuário se compromete a:
          <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 20 }}>
            <li>Utilizar a plataforma exclusivamente para fins lícitos e educacionais;</li>
            <li>Não compartilhar suas credenciais de acesso com terceiros;</li>
            <li>Não tentar acessar funcionalidades, contas ou dados de outros usuários;</li>
            <li>Não utilizar a plataforma para qualquer atividade ilegal, fraudulenta ou prejudicial;</li>
            <li>Não realizar engenharia reversa, copiar ou redistribuir qualquer parte do sistema sem autorização expressa.</li>
          </ul>
        </Section>

        <Section title="3. Conduta no Chat e Sala de Estudos">
          A plataforma disponibiliza recursos de comunicação entre usuários (chat e sala de estudos virtuais). O usuário se compromete expressamente a:
          <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 20 }}>
            <li>Manter linguagem respeitosa e adequada em todas as interações;</li>
            <li>Não publicar conteúdo ofensivo, discriminatório, racista, sexista, homofóbico ou que incite o ódio;</li>
            <li>Não assediar, intimidar ou ameaçar outros usuários;</li>
            <li>Não compartilhar conteúdo ilegal, pornográfico ou violento;</li>
            <li>Não fazer spam, publicidade não autorizada ou divulgar links maliciosos;</li>
            <li>Não se passar por outra pessoa ou entidade.</li>
          </ul>
          O descumprimento dessas regras pode resultar em suspensão ou encerramento imediato da conta, sem aviso prévio.
        </Section>

        <Section title="4. Propriedade Intelectual">
          Todo o conteúdo original da plataforma — incluindo mas não se limitando ao código-fonte, design, textos, metodologias de estudo, ferramentas e funcionalidades — é de propriedade exclusiva da Aprova.se e protegido pelas leis brasileiras de propriedade intelectual (Lei nº 9.610/1998). É vedada a reprodução total ou parcial sem autorização prévia por escrito.
        </Section>

        <Section title="5. Privacidade e LGPD">
          A Aprova.se trata seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Coletamos apenas os dados necessários para o funcionamento da plataforma (nome, e-mail, preferências de estudo e dados de uso). Seus dados:
          <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 20 }}>
            <li>Não são vendidos a terceiros;</li>
            <li>São armazenados com segurança e protegidos por criptografia;</li>
            <li>Podem ser excluídos mediante solicitação ao suporte;</li>
            <li>Você tem o direito de acessar, corrigir e portabilizar seus dados a qualquer momento.</li>
          </ul>
          Utilizamos cookies próprios para manter sua sessão ativa e melhorar sua experiência. Não utilizamos cookies de rastreamento de terceiros para fins publicitários.
        </Section>

        <Section title="6. Conta e Segurança">
          Você é responsável pela confidencialidade de sua senha e por todas as atividades realizadas em sua conta. Em caso de acesso não autorizado suspeito, notifique-nos imediatamente. A Aprova.se não se responsabiliza por danos decorrentes do uso não autorizado de sua conta por falha de guarda de credenciais por parte do usuário.
        </Section>

        <Section title="7. Suspensão e Encerramento">
          A Aprova.se reserva-se o direito de suspender ou encerrar contas que violem estes Termos, utilizem a plataforma de forma abusiva, ou cujas atividades coloquem em risco a segurança ou integridade do sistema ou de outros usuários. Em casos graves, poderemos reportar atividades às autoridades competentes.
        </Section>

        <Section title="8. Limitação de Responsabilidade">
          A plataforma é fornecida "no estado em que se encontra". A Aprova.se não garante disponibilidade ininterrupta e não se responsabiliza por perdas de dados causadas por falhas técnicas, ataques externos ou fatores fora de seu controle razoável.
        </Section>

        <Section title="9. Alterações nos Termos">
          Podemos atualizar estes Termos a qualquer momento. Mudanças significativas serão comunicadas por e-mail ou notificação na plataforma com antecedência mínima de 15 dias. O uso continuado após a vigência das alterações implica aceitação dos novos termos.
        </Section>

        <Section title="10. Foro e Legislação Aplicável">
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Porto Alegre/RS para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
        </Section>

        <div style={{ marginTop: 32, padding: '16px 20px', background: 'rgba(124,58,237,0.08)', borderRadius: 12, border: '1px solid rgba(124,58,237,0.2)' }}>
          <p style={{ color: '#a78bfa', fontSize: '0.85rem', margin: 0 }}>
            Dúvidas? Entre em contato: <strong>suporte@aprova.se</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
