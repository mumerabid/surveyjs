import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { surveyService } from "../services/surveyService";
import "survey-core/survey-core.css";

export const SurveyResults = () => {
  const { id } = useParams();
  const [responses, setResponses] = useState([]);
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [surveyModel, setSurveyModel] = useState(null);
  const [_currentPageNo, setCurrentPageNo] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [surveyData, responsesData] = await Promise.all([
          surveyService.getSurvey(id),
          surveyService.getResponses(id),
        ]);
        setSurvey(surveyData);
        setResponses(responsesData);
      } catch (err) {
        console.error("Error fetching survey results:", err);
        setError("Failed to load survey results. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchData();
    }
  }, [id]);

  // Format functions
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // When a response is selected, create and store the SurveyJS model
  useEffect(() => {
    if (selectedResponse && survey && survey.json) {
      try {
        const surveyJson =
          typeof survey.json === "string"
            ? JSON.parse(survey.json)
            : survey.json;
        const model = new Model(surveyJson);
        model.mode = "display";
        model.showNavigationButtons = false; // Hide built-in nav
        model.showCompletedPage = false;
        model.data = selectedResponse.data || {};
        setSurveyModel(model);
        setCurrentPageNo(0); // Always start on first page
      } catch (error) {
        setSurveyModel(null);
        console.error("Error creating survey model:", error);
      }
    } else {
      setSurveyModel(null);
    }
  }, [selectedResponse, survey]);

  // Handlers for opening/closing modal
  const handleViewDetails = (response) => setSelectedResponse(response);
  const closeModal = () => setSelectedResponse(null);

  // Handlers for page navigation
  const handlePrev = () => {
    if (surveyModel && surveyModel.currentPageNo > 0) {
      surveyModel.currentPageNo -= 1;
      setCurrentPageNo(surveyModel.currentPageNo);
    }
  };
  const handleNext = () => {
    if (
      surveyModel &&
      surveyModel.currentPageNo < surveyModel.visiblePageCount - 1
    ) {
      surveyModel.currentPageNo += 1;
      setCurrentPageNo(surveyModel.currentPageNo);
    }
  };

  // Export functions
  const exportToJSON = () => {
    const exportData = {
      survey: {
        id: survey._id,
        title: survey.title,
        description: survey.description,
        exportDate: new Date().toISOString(),
      },
      responses: responses.map((response) => ({
        id: response._id,
        submittedAt: response.submittedAt,
        data: response.data,
      })),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${survey.title}_responses_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Export SurveyJS responses to CSV.
   * @param {Array} responses - Array of response objects, each with a 'data' property.
   * @param {Object} surveyJson - Survey JSON definition.
   */
  function exportSurveyResponsesToCsv(responses, surveyJson) {
    // Gather all question names in order, with their titles
    const getQuestionHeaders = (surveyJson) => {
      let headers = [];
      const traverse = (elements) => {
        if (!elements) return;
        elements.forEach((el) => {
          if (
            el.type === "panel" ||
            el.type === "paneldynamic" ||
            el.type === "matrixdynamic"
          ) {
            traverse(el.elements || el.templateElements);
          } else if (el.type === "matrix" && el.rows) {
            // For matrix questions, add a header per row
            el.rows.forEach((row) => {
              headers.push({
                name: `${el.name}.${typeof row === "object" ? row.value : row}`,
                title: `${el.title || el.name} [${
                  typeof row === "object" ? row.text : row
                }]`,
              });
            });
          } else {
            headers.push({ name: el.name, title: el.title || el.name });
          }
        });
      };
      if (surveyJson.pages) {
        surveyJson.pages.forEach((page) => traverse(page.elements));
      } else {
        traverse(surveyJson.elements);
      }
      return headers;
    };

    // Helper to serialize any value type for CSV
    const serializeValue = (value) => {
      if (Array.isArray(value)) {
        return value.map((v) => serializeValue(v)).join(", ");
      } else if (typeof value === "object" && value !== null) {
        return JSON.stringify(value);
      } else if (typeof value === "boolean") {
        return value ? "Yes" : "No";
      } else if (value === null || value === undefined) {
        return "";
      }
      return String(value);
    };

    const surveyJsonObj =
      typeof surveyJson === "string" ? JSON.parse(surveyJson) : surveyJson;
    const headers = getQuestionHeaders(surveyJsonObj);

    // Prepare CSV rows
    const csvRows = [];
    // Add header row
    csvRows.push(
      headers.map((h) => `"${h.title.replace(/"/g, '""')}"`).join(",")
    );

    responses.forEach((response) => {
      const data = response.data || {};
      const row = headers.map((header) => {
        // Handle matrix
        if (header.name.includes(".")) {
          const [qName, rowName] = header.name.split(".");
          if (data[qName] && typeof data[qName] === "object") {
            return `"${serializeValue(data[qName][rowName])}"`;
          }
          return '""';
        }
        // Standard
        return `"${serializeValue(data[header.name])}"`;
      });
      csvRows.push(row.join(","));
    });

    // Generate CSV string
    const csvString = csvRows.join("\r\n");

    // Download
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "survey_responses.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const exportSummaryReport = () => {
    // Create a summary report with statistics
    const reportData = {
      survey: {
        title: survey.title,
        description: survey.description,
        totalResponses: responses.length,
        exportDate: new Date().toISOString(),
      },
      statistics: {},
      responses: responses.map((response) => ({
        id: response._id,
        submittedAt: response.submittedAt,
        data: response.data,
      })),
    };

    // Calculate basic statistics
    if (responses.length > 0) {
      const allKeys = new Set();
      responses.forEach((response) => {
        if (response.data) {
          Object.keys(response.data).forEach((key) => allKeys.add(key));
        }
      });

      // Calculate response rates and common answers for each question
      Array.from(allKeys).forEach((key) => {
        const values = responses
          .map((r) => r.data?.[key])
          .filter((v) => v !== undefined && v !== null && v !== "");
        reportData.statistics[key] = {
          responseCount: values.length,
          responseRate:
            ((values.length / responses.length) * 100).toFixed(1) + "%",
          uniqueValues: [...new Set(values)].length,
        };
      });
    }

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${survey.title}_summary_report_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading survey results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="error-container">
        <h2>Survey Not Found</h2>
        <p>The requested survey could not be found.</p>
      </div>
    );
  }

  return (
    <div className="survey-results-container">
      <div className="survey-results-header">
        <h1>Survey Results</h1>
        <div className="survey-info">
          <h2>{survey.title}</h2>
          {survey.description && (
            <p className="survey-description">{survey.description}</p>
          )}
          <div className="results-stats">
            <span className="stat">
              <strong>{responses.length}</strong> Response
              {responses.length !== 1 ? "s" : ""}
            </span>
          </div>
          {responses.length > 0 && (
            <div
              className="export-actions"
              style={{
                marginTop: "1rem",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={exportToJSON}
                className="export-button json"
                style={{
                  backgroundColor: "#17a2b8",
                  color: "white",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#138496";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#17a2b8";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                📄 Export JSON
              </button>
              <button
                onClick={() =>
                  exportSurveyResponsesToCsv(responses, survey.json)
                }
                className="export-button csv"
                style={{
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#218838";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#28a745";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                📊 Export CSV
              </button>
              <button
                onClick={exportSummaryReport}
                className="export-button summary"
                style={{
                  backgroundColor: "#6f42c1",
                  color: "white",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#5a2d91";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#6f42c1";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                📈 Summary Report
              </button>
            </div>
          )}
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="no-responses">
          <h3>No Responses Yet</h3>
          <p>This survey hasn't received any responses yet.</p>
        </div>
      ) : (
        <div className="responses-grid">
          {responses.map((response, index) => (
            <div key={response._id} className="response-card">
              <div className="response-card-header">
                <span className="response-number">#{index + 1}</span>
                <span className="response-id">ID: {response._id}</span>
                <div className="response-dates">
                  <div className="response-card-date">
                    {formatDate(response.submittedAt)}
                  </div>
                  <div className="response-card-time">
                    {formatTime(response.submittedAt)}
                  </div>
                </div>
              </div>
              <button
                className="response-card-action"
                onClick={() => handleViewDetails(response)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal for viewing response details */}
      {selectedResponse && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p>
                <strong>Response ID:</strong> {selectedResponse._id}
              </p>
              <p>
                <strong>Submitted:</strong>{" "}
                {formatDate(selectedResponse.submittedAt)} at{" "}
                {formatTime(selectedResponse.submittedAt)}
              </p>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="response-survey-display">
                {surveyModel ? (
                  <div className="survey-response-container">
                    <Survey model={surveyModel} />
                    {/* Custom navigation */}
                    <div
                      className="custom-navigation"
                      style={{
                        // marginTop: 16,
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "10px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "8px",
                        border: "1px solid #e9ecef",
                      }}
                    >
                      <button
                        onClick={handlePrev}
                        disabled={surveyModel.currentPageNo === 0}
                        style={{
                          padding: "10px 20px",
                          border: "none",
                          borderRadius: "6px",
                          backgroundColor:
                            surveyModel.currentPageNo === 0
                              ? "#6c757d"
                              : "#007bff",
                          color: "white",
                          cursor:
                            surveyModel.currentPageNo === 0
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          opacity: surveyModel.currentPageNo === 0 ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (surveyModel.currentPageNo !== 0) {
                            e.target.style.backgroundColor = "#0056b3";
                            e.target.style.transform = "translateY(-1px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (surveyModel.currentPageNo !== 0) {
                            e.target.style.backgroundColor = "#007bff";
                            e.target.style.transform = "translateY(0)";
                          }
                        }}
                      >
                        ← Previous
                      </button>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#495057",
                          fontSize: "14px",
                          padding: "0 8px",
                        }}
                      >
                        Page {surveyModel.currentPageNo + 1} of{" "}
                        {surveyModel.visiblePageCount}
                      </span>
                      <button
                        onClick={handleNext}
                        disabled={
                          surveyModel.currentPageNo ===
                          surveyModel.visiblePageCount - 1
                        }
                        style={{
                          padding: "10px 20px",
                          border: "none",
                          borderRadius: "6px",
                          backgroundColor:
                            surveyModel.currentPageNo ===
                            surveyModel.visiblePageCount - 1
                              ? "#6c757d"
                              : "#007bff",
                          color: "white",
                          cursor:
                            surveyModel.currentPageNo ===
                            surveyModel.visiblePageCount - 1
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          opacity:
                            surveyModel.currentPageNo ===
                            surveyModel.visiblePageCount - 1
                              ? 0.6
                              : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (
                            surveyModel.currentPageNo !==
                            surveyModel.visiblePageCount - 1
                          ) {
                            e.target.style.backgroundColor = "#0056b3";
                            e.target.style.transform = "translateY(-1px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (
                            surveyModel.currentPageNo !==
                            surveyModel.visiblePageCount - 1
                          ) {
                            e.target.style.backgroundColor = "#007bff";
                            e.target.style.transform = "translateY(0)";
                          }
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                ) : (
                  // Fallback to raw JSON display if survey model creation fails
                  <div className="response-answers">
                    <h4>Answers:</h4>
                    {Object.entries(selectedResponse.responses || {}).map(
                      ([questionKey, answer]) => (
                        <div key={questionKey} className="answer-item">
                          <div className="question-key">{questionKey}:</div>
                          <div className="answer-value">
                            {typeof answer === "object"
                              ? JSON.stringify(answer, null, 2)
                              : String(answer)}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
