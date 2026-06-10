// Wrapper que marca um bloco como "exportável" para apresentações.
// Não muda visual — só adiciona atributos data-* que o ExportPanel
// usa pra varrer o DOM, gerar thumbnails e empacotar em ZIP/PNG.

export function Exportable({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-export-id={id} data-export-label={label} className={className}>
      {children}
    </div>
  );
}
