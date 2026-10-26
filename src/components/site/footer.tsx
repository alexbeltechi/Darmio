export function Footer({ siteName }: { siteName: string }) {
  return (
    <footer className="px-5 py-5 mt-5">
      <p className="text-center text-p text-ds-fg">
        © {siteName} {new Date().getFullYear()}
      </p>
    </footer>
  );
}
