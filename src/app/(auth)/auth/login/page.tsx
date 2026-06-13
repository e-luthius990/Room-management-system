import type { JSX } from "react";

import { LoginForm } from "./login-form";

type LoginSearchParams = {
  error?: string | string[];
  next?: string | string[];
};

type LoginPageProps = {
  searchParams?: Promise<LoginSearchParams> | LoginSearchParams;
};

function getFirstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <LoginForm
      initialError={getFirstSearchParam(resolvedSearchParams.error)}
      initialNext={getFirstSearchParam(resolvedSearchParams.next)}
    />
  );
}
