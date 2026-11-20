CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'mechanic', 'client')),
  phone VARCHAR(20),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  tenant_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES users(id),
  mechanic_id UUID REFERENCES users(id),
  vehicle_plate VARCHAR(20) NOT NULL,
  vehicle_model VARCHAR(100),
  description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'in_analysis', 'awaiting_part', 'in_service', 'completed', 'cancelled')),
  estimated_delivery TIMESTAMPTZ,
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INT DEFAULT 1
);

CREATE TABLE work_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('part', 'service')),
  description TEXT NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wo_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(30) NOT NULL CHECK (type IN ('status_change', 'note', 'photo', 'price_change', 'approval', 'rejection')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  update_id UUID REFERENCES wo_updates(id),
  url TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  wo_id UUID REFERENCES work_orders(id),
  type VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  payload JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'ack', 'failed')),
  sent_at TIMESTAMPTZ,
  ack_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id UUID NOT NULL REFERENCES work_orders(id),
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(20) CHECK (method IN ('boleto', 'pix', 'card')),
  payment_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wo_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_id UUID NOT NULL REFERENCES work_orders(id),
  field VARCHAR(50) NOT NULL,
  local_value JSONB NOT NULL,
  server_value JSONB NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wo_tenant ON work_orders(tenant_id);
CREATE INDEX idx_wo_client ON work_orders(client_id);
CREATE INDEX idx_wo_status ON work_orders(status);
CREATE INDEX idx_wo_code ON work_orders(code);
CREATE INDEX idx_wo_updates_wo ON wo_updates(wo_id, created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id, status);
CREATE INDEX idx_attachments_wo ON attachments(wo_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);