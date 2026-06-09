-- Trigger: crea el perfil automáticamente cuando se registra un usuario
-- Ejecutar en Supabase → SQL Editor

CREATE OR REPLACE FUNCTION public.crear_perfil_nuevo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  tiendas_arr text[];
BEGIN
  SELECT array_agg(v::text)
  INTO tiendas_arr
  FROM jsonb_array_elements_text(
    COALESCE(new.raw_user_meta_data->'tiendas', '[]'::jsonb)
  ) v;

  INSERT INTO public.profiles (id, nombre, correo, tiendas)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre', ''),
    new.email,
    COALESCE(tiendas_arr, '{}')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_nuevo_usuario();
