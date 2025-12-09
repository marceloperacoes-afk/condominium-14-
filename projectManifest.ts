

/**
 * PROJECT MANIFEST & AUDIT LOG
 * ----------------------------
 * Este arquivo serve como a "consciência" do projeto.
 * Ele lista todas as regras de negócio, decisões de design e funcionalidades
 * que JÁ ESTÃO implementadas e DEVEM ser mantidas em futuras atualizações.
 * 
 * SEMPRE CONSULTE ESTE ARQUIVO ANTES DE GERAR CÓDIGO NOVO.
 */

export const PROJECT_MANIFEST = {
  meta: {
    projectName: "Condominium+",
    version: "8.0 (Pool Control Module)",
    environment: "Production",
    database: "Firebase Firestore (Hardcoded Config)",
  },

  designSystem: {
    style: "Clean & Modern (Evolution from Glassmorphism)",
    font: "Inter (Google Fonts)",
    colors: {
      primary: "brand-600 (#0284c7)",
      danger: "red-500",
      success: "emerald-500",
      warning: "amber-500",
      background: "slate-50",
    },
    components: {
      cards: "Rounded-2xl or 3xl, White, Shadow-sm (hover: Shadow-md)",
      buttons: "Rounded-xl, Font-bold, Shadows tailored to color",
      modals: "Backdrop-blur, Rounded-3xl, Animated entrance",
    }
  },

  roles: {
    RESIDENT: {
      layout: "Grade de Cards (Imagens Grandes)",
      features: [
        "Hero Section com 'Próxima Atividade' e 'Encomendas Pendentes'",
        "Abas: Dashboard, Minhas Reservas (Recentes/Histórico), Encomendas",
        "Reserva Diária (Sem seleção de hora, dia inteiro)",
        "Carteirinha Digital (QR Code) para acesso à piscina",
        "Notificações: Cancelamento (Alerta Vermelho) e Promoção de Fila (Festa)",
      ]
    },
    MANAGER: {
      layout: "Dashboard Administrativo Completo",
      features: [
        "Gráficos Recharts (Área + Pizza + KPIs)",
        "Gestão de Usuários (Adicionar, Bloquear, Resetar Senha, Excluir)",
        "Gestão de Áreas (CRUD com Upload de Foto + Regras de Uso)",
        "Configurações Gerais",
      ]
    },
    ADMIN: {
      layout: "Painel Operacional Simplificado",
      features: [
        "Aprovar/Rejeitar Reservas (Obrigatório Justificativa)",
        "Gestão de Encomendas (Foto via Câmera + Validação de Código)",
        "Controle de Piscina (Scanner QR, Contador, Alertas de Lotação > 60)",
        "Histórico de Entregas",
      ]
    }
  },

  businessRules: {
    pool: {
      capacity: 60,
      privacy: "Tela principal exibe apenas números. Logs salvam nomes.",
      access: "Via QR Code da carteirinha digital.",
      alerts: "Verde (<40), Amarelo (<60), Vermelho (>60)."
    },
    reservations: {
      logic: "Diária (OpenTime ao CloseTime)",
      constraints: [
        "Não reservar dia já ocupado (vai para Fila de Espera)",
        "Não entrar na Fila de Espera se já tem reserva no dia (Self-Block)",
        "Unicidade na Fila: Usuário só pode entrar 1 vez na fila por data/área",
        "Áreas Vinculadas (Ex: Salão bloqueia Churrasqueira)",
      ],
      waitingList: {
        behavior: "Automática. Cancelamento promove o próximo da fila.",
        visibility: "Morador vê sua posição e quem está na frente (Nome/Apto)",
      },
      confirmation: "Exige aceite dos Termos de Uso (Modal)",
    },
    packages: {
      delivery: "Requer Código de Validação do Morador.",
      ui: "Optimistic UI (Atualização instantânea ao entregar).",
      privacy: "Admin não vê o código no card, precisa pedir ao morador.",
    },
    users: {
      security: "Bloqueio de acesso via flag isBlocked.",
      recovery: "Reset de senha manual pelo Síndico.",
    }
  },

  fixesAndOptimizations: {
    firebase: [
      "Conexão via constantes hardcoded (evita tela de setup)",
      "Tratamento de erro 'permission-denied'",
      "CleanData helper para evitar campos 'undefined'",
    ],
    ui: [
      "Z-Index fix no botão de entrega de encomendas",
      "Correção de Badges (CSS aparecendo como texto)",
      "Compressão de Imagem (Canvas) no upload para evitar limite de 1MB do Firestore",
    ],
    ux: [
      "Paginação e Busca no histórico do morador",
      "Alertas visuais claros para códigos errados",
      "Bloqueio visual para duplicação na lista de espera",
    ]
  }
};