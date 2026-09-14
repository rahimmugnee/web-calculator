BEGIN;

UPDATE companies
SET signatory_phone = '01717-079855',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'sasha';

COMMIT;
