-- Replace "<n> USD" patterns inside notification descriptions with "<n*4500> MMK"
DO $$
DECLARE
  r record;
  v_desc text; v_desc_my text;
  m text[]; v_num bigint;
BEGIN
  FOR r IN SELECT id, description, description_my FROM public.notifications
           WHERE description ~ '\d+\s*USD' OR description_my ~ '\d+\s*USD'
  LOOP
    v_desc := r.description;
    v_desc_my := r.description_my;

    -- English: replace each "<num> USD" with MMK equivalent
    LOOP
      m := regexp_match(v_desc, '(\d+(?:\.\d+)?)\s*USD');
      EXIT WHEN m IS NULL;
      v_num := round(m[1]::numeric * 4500);
      v_desc := regexp_replace(v_desc, '\d+(?:\.\d+)?\s*USD', v_num::text || ' MMK');
    END LOOP;

    LOOP
      m := regexp_match(v_desc_my, '(\d+(?:\.\d+)?)\s*USD');
      EXIT WHEN m IS NULL;
      v_num := round(m[1]::numeric * 4500);
      v_desc_my := regexp_replace(v_desc_my, '\d+(?:\.\d+)?\s*USD', v_num::text || ' MMK');
    END LOOP;

    UPDATE public.notifications SET description = v_desc, description_my = v_desc_my WHERE id = r.id;
  END LOOP;
END $$;