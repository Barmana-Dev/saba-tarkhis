import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { Alert, Button, Card, Field, Input, Textarea } from "../ui";

const fields = [
  { key: "company.tagline", label: "شعار کوتاه شرکت", textarea: false },
  { key: "company.intro", label: "معرفی کوتاه (صفحه درباره ما)", textarea: true },
  { key: "contact.phone", label: "تلفن تماس", textarea: false },
  { key: "contact.email", label: "ایمیل تماس", textarea: false },
  { key: "contact.address", label: "نشانی", textarea: false },
  { key: "contact.hours", label: "ساعات پاسخگویی", textarea: false },
  { key: "contact.instagram", label: "اینستاگرام", textarea: false },
  { key: "site.notice", label: "اطلاعیه فوتر", textarea: true },
];

export function SettingsTab() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<Record<string, string>>("/admin/settings"),
  });

  useEffect(() => {
    if (settings.data) setValues(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => api.patch("/admin/settings", { settings: values }),
    onSuccess: () => {
      setNotice("تنظیمات ذخیره شد.");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
  });

  return (
    <Card>
      <h3 className="text-sm font-bold text-brand-900">اطلاعات عمومی سایت</h3>
      <p className="mt-1 text-xs leading-6 text-slate-500">
        فقط اطلاعات تأییدشده را وارد کنید. مقدار «نیازمند تأیید کارفرما» در سایت نمایش داده می‌شود و
        نباید با اطلاعات حدسی جایگزین شود.
      </p>

      {notice ? <Alert tone="success" className="mt-3">{notice}</Alert> : null}
      {save.isError ? (
        <Alert tone="error" className="mt-3">
          {save.error instanceof ApiError ? save.error.message : "ذخیره تنظیمات انجام نشد."}
        </Alert>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.key} label={field.label} htmlFor={`setting-${field.key}`}>
            {field.textarea ? (
              <Textarea
                id={`setting-${field.key}`}
                rows={3}
                value={values[field.key] ?? ""}
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
              />
            ) : (
              <Input
                id={`setting-${field.key}`}
                value={values[field.key] ?? ""}
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
              />
            )}
          </Field>
        ))}
      </div>

      <Button className="mt-5" loading={save.isPending} onClick={() => save.mutate()}>
        ذخیره تنظیمات
      </Button>
    </Card>
  );
}
