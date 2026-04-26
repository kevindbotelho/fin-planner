-- Adicionando a coluna bank_origin na tabela expenses
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS bank_origin TEXT CHECK (bank_origin IN ('Nubank', 'Inter'));

-- Comentário para documentar a tabela
COMMENT ON COLUMN expenses.bank_origin IS 'Origem bancária da despesa, atualmente restrito a Nubank e Inter.';
