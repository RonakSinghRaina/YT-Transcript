-- Persist AI/extractive video summaries on saved transcripts
ALTER TABLE transcript_history
  ADD COLUMN IF NOT EXISTS summary jsonb;
