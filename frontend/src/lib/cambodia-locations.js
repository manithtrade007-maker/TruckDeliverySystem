// Approximate district / municipality centers for the report map. These are
// display coordinates only; delivery records and report calculations are untouched.
const rows = [
  ["KH.Kambol (PP)",104.76,11.49],["KH.Dangkao (PP)",104.85,11.49],["KH.Mean Chey (PP)",104.93,11.52],["KH.Chamkar Morn (PP)",104.92,11.54],
  ["KH.Boeng Keng Kong (PP)",104.93,11.55],["KH.Doun Penh (PP)",104.92,11.58],["KH.7 Makara (PP)",104.91,11.56],["KH.Tuol Kouk (PP)",104.89,11.58],
  ["KH.Sen Sok (PP)",104.87,11.62],["KH.Russei Keo (PP)",104.91,11.63],["KH.Chba Ampeou (PP)",104.96,11.53],["KH.Posenchey (PP)",104.83,11.56],
  ["KH.Prek Phnov (PP)",104.88,11.70],["KH.Chroy Changvar (PP)",104.94,11.60],
  ["D.Takhmao (Kandal)",104.94,11.48],["D.Kandal Stueng (Kandal)",104.80,11.36],["D.Saang (Kandal)",104.76,11.24],["D.Kien Svay (Kandal)",105.04,11.39],
  ["D.Ang Snuol (Kandal)",104.73,11.71],["D.Muk Kampoul (Kandal)",104.96,11.72],["D.Khsach Kandal (Kandal)",105.00,11.79],["D.Ponhea Leu (Kandal)",104.96,11.91],
  ["D.Koh Thom (Kandal)",105.10,11.18],["D.Leukdek (Kandal)",105.27,11.08],["D.Lvea Em (Kandal)",105.00,11.34],
  ["D.Bati (Takeo)",104.78,11.18],["D.Samrong (Takeo)",104.86,11.10],["D.Prey Kabas (Takeo)",104.95,10.98],["D.Daun Keo (Takeo)",104.78,10.99],
  ["D.Treang (Takeo)",104.91,10.86],["D.Angkor Borei (Takeo)",105.03,10.99],["D.Tram Kak (Takeo)",104.67,10.95],["D.Koh Andet (Takeo)",105.10,10.88],
  ["D.Borei Chulsar (Takeo)",105.22,10.97],["D.Kirivong (Takeo)",104.81,10.80],
  ["D.Kong Pisei (K.Speu)",104.60,11.34],["D.Chbar Morn (K.Speu)",104.45,11.45],["D.Oudong (K.Speu)",104.69,11.62],["D.Samrong Torng (K.Speu)",104.52,11.26],
  ["D.Baset (K.Speu)",104.65,11.22],["D.Phnom Srouch (K.Speu)",104.27,11.25],["D.Thpong (K.Speu)",104.26,11.68],["D.Kirirom (K.Speu)",104.08,11.34],["D.Oral (K.Speu)",104.08,12.00],
  ["D.Peam Ro (Prey Veng)",105.39,11.27],["D.Pea Reang (Prey Veng)",105.28,11.39],["D.Baphnom (Prey Veng)",105.49,11.48],["D.Peam Chor (Prey Veng)",105.22,11.53],
  ["D.Kampong Trabek (Prey Veng)",105.65,11.11],["D.Preah Sdach (Prey Veng)",105.42,11.04],["D.Prey Veng (Prey Veng)",105.33,11.49],["D.Po Rieng (Prey Veng)",105.27,11.32],
  ["D.Sithor Kandal (Prey Veng)",105.45,11.61],["D.Mesang (Prey Veng)",105.16,11.27],["D.Svay Antor (Prey Veng)",105.55,11.37],["D.Kanh Chreach (Prey Veng)",105.36,11.70],["D.Kamchay Mea (Prey Veng)",105.58,11.58],
  ["D.Svay Chrum (Svay Rieng)",105.82,11.16],["D.Svay Rieng (Svay Rieng)",105.80,11.08],["D.Rum Duol (Svay Rieng)",105.67,10.91],["D.Romeas Hek (Svay Rieng)",105.92,11.05],
  ["D.Svay Tiep (Svay Rieng)",106.03,10.90],["D.Kompong Ro (Svay Rieng)",105.92,11.29],["D.Bavet (Svay Rieng)",106.16,10.88],["D.Chantrea (Svay Rieng)",106.05,10.99],
  ["D.Kampong Tralach (K.Chhnan)",104.73,12.22],["D.Rolear Phiear (K.Chhnan)",104.53,12.27],["D.Kampong Chhnang (K.Chhnan)",104.67,12.25],["D.Chulkiri (K.Chhnan)",104.85,12.17],
  ["D.Tuek Phos (K.Chhnan)",104.52,12.04],["D.Boribo (K.Chhnan)",104.85,12.08],["D.Kampong Leng (K.Chhnan)",104.70,12.44],["D.Samaki Meanchey (K.Chhnan)",104.53,11.86],
  ["D.Srey Santhor (K.Cham)",105.22,11.90],["D.Batheay (K.Cham)",105.08,12.03],["D.Prey Chhor (K.Cham)",105.18,11.79],["D.Kampong Siem (K.Cham)",105.47,12.00],
  ["D.Chamkar Leu (K.Cham)",105.25,12.30],["D.Kang Meas (K.Cham)",105.37,11.94],
  ["D.Angkor Chey (Kampot)",104.60,10.65],["D.Chhouk (Kampot)",104.48,10.78],["D.Chumkiri (Kampot)",104.43,10.59],["D.Dong Tung (Kampot)",104.35,10.72],
  ["D.Kampong Trach (Kampot)",104.55,10.53],["D.Kampot (Kampot)",104.18,10.61],["D.Tuek Chhu (Kampot)",104.10,10.72],["D.Damnak Changeor (Kep)",104.31,10.49],["D.Kep (Kep)",104.30,10.48],
  ["D.Santuk (K.Thom)",104.90,12.86],["D.Stueng Sen (K.Thom)",104.89,12.71],["D.Staung (K.Thom)",104.47,12.54],
];

export const cambodiaLocationCoordinates = new Map(rows.map(([name, longitude, latitude]) => [name.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase(), { longitude, latitude }]));

