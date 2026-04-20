ALTER TABLE public.notifications DROP CONSTRAINT notifications_notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type = ANY (ARRAY[
    'job','application','mentor','message','guide','premium','system','payment','booking'
  ]));