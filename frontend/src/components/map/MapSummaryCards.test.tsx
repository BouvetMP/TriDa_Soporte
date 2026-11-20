import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MapSummaryCards } from "./MapSummaryCards";

afterEach(cleanup);

describe("MapSummaryCards", () => {
  it("shows four distinct geographic summary metrics", () => {
    render(
      <MapSummaryCards
        summary={{
          total_geolocalizadas: 12,
          ciudades_distintas: 3,
          paises_distintos: 2,
          transacciones_riesgo_alto: 4,
          score_promedio: 82.5,
        }}
      />,
    );

    expect(screen.getByText("Ubicaciones registradas")).toBeTruthy();
    expect(screen.getByText("Ciudades")).toBeTruthy();
    expect(screen.getByText("Países registrados")).toBeTruthy();
    expect(screen.getByText("Riesgo alto")).toBeTruthy();
    expect(screen.queryByText("Puntos registrados")).toBeNull();
  });
});
