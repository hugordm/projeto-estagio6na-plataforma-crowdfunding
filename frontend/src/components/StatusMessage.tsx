// Mensagens padrão para os estados de carregamento, erro e lista vazia.

export function Loading({ text = "Carregando..." }: { text?: string }) {
  return <p className="py-8 text-center text-sm text-zinc-500">{text}</p>;
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-zinc-500">{text}</p>;
}
