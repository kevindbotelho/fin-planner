export function DashedGuides() {
  return (
    <div className="dashed-guide-container max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Ocultamos as linhas das extremidades (1ª e 4ª) para evitar colisões e sobreposição visual com as bordas laterais dos cartões e do header */}
      <div className="dashed-guide-line opacity-0 pointer-events-none" />
      <div className="dashed-guide-line" />
      <div className="dashed-guide-line" />
      <div className="dashed-guide-line opacity-0 pointer-events-none" />
    </div>
  );
}
