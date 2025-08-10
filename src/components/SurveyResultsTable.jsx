import React, { useRef, useEffect } from "react";
import { Model } from "survey-core";
import { Tabulator } from "survey-analytics/survey.analytics.tabulator";
import "survey-core/survey-core.css";
import "survey-analytics/survey.analytics.tabulator.css";
import "tabulator-tables/dist/css/tabulator.css";

// surveyJson: the survey definition (object)
// surveyResults: array of survey responses
export const SurveyResultsTable = ({ surveyJson, surveyResults }) => {
  const tableContainerRef = useRef(null);

  useEffect(() => {
    if (!surveyJson || !surveyResults || !tableContainerRef.current) return;

    // Create SurveyJS Model and Tabulator Table
    const model = new Model(surveyJson);
    const table = new Tabulator(model, surveyResults);

    // Render the table into the referenced div
    table.render(tableContainerRef.current);

    // Cleanup on unmount
    return () => {
      if (table && typeof table.dispose === "function") {
        table.dispose();
      } else if (tableContainerRef.current) {
        tableContainerRef.current.innerHTML = "";
      }
    };
  }, [surveyJson, surveyResults]);

  return (
    <div>
      <h2>Survey Results Table</h2>
      {/* This div will hold the Tabulator table */}
      <div ref={tableContainerRef} />
    </div>
  );
};
