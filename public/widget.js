/**
 * FeedbackTool Embeddable Widget
 *
 * Usage:
 * <script src="https://your-app.com/widget.js"
 *         data-survey-id="YOUR_SURVEY_ID"
 *         data-position="bottom-right"
 *         data-primary-color="#2563eb"
 *         async></script>
 *
 * This widget renders in an iframe to avoid CSS conflicts with the host page.
 * It fetches the survey configuration from the API and renders a compact survey form.
 */
(function () {
  "use strict";

  // Find the script tag to read configuration
  var scripts = document.querySelectorAll('script[data-survey-id]');
  var script = scripts[scripts.length - 1];

  if (!script) {
    console.error("FeedbackTool: No survey ID found. Add data-survey-id to the script tag.");
    return;
  }

  var config = {
    surveyId: script.getAttribute("data-survey-id"),
    position: script.getAttribute("data-position") || "bottom-right",
    primaryColor: script.getAttribute("data-primary-color") || "#2563eb",
    apiUrl: script.src.replace("/widget.js", ""),
  };

  // Create the widget container
  var container = document.createElement("div");
  container.id = "feedbacktool-widget";
  container.style.cssText =
    "position:fixed;z-index:999999;" +
    (config.position.includes("bottom") ? "bottom:20px;" : "top:20px;") +
    (config.position.includes("right") ? "right:20px;" : "left:20px;");

  // Create trigger button
  var button = document.createElement("button");
  button.innerHTML = "&#x1F4AC; Feedback";
  button.style.cssText =
    "background:" + config.primaryColor + ";" +
    "color:white;border:none;padding:10px 20px;border-radius:24px;" +
    "cursor:pointer;font-size:14px;font-family:system-ui,sans-serif;" +
    "box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:transform 0.2s;";
  button.onmouseover = function () { button.style.transform = "scale(1.05)"; };
  button.onmouseout = function () { button.style.transform = "scale(1)"; };

  // Create the survey panel (hidden initially)
  var panel = document.createElement("div");
  panel.style.cssText =
    "display:none;width:360px;max-height:500px;background:white;" +
    "border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);" +
    "overflow:hidden;margin-bottom:12px;font-family:system-ui,sans-serif;";

  var isOpen = false;

  button.addEventListener("click", function () {
    isOpen = !isOpen;
    panel.style.display = isOpen ? "block" : "none";
    if (isOpen && !panel.dataset.loaded) {
      loadSurvey();
    }
  });

  function loadSurvey() {
    panel.innerHTML =
      '<div style="padding:24px;text-align:center;color:#6b7280;">Loading survey...</div>';
    panel.dataset.loaded = "true";

    fetch(config.apiUrl + "/api/surveys/" + config.surveyId)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.survey) {
          panel.innerHTML =
            '<div style="padding:24px;text-align:center;color:#ef4444;">Survey not found</div>';
          return;
        }
        renderSurvey(data.survey);
      })
      .catch(function (err) {
        panel.innerHTML =
          '<div style="padding:24px;text-align:center;color:#ef4444;">Failed to load survey</div>';
        console.error("FeedbackTool:", err);
      });
  }

  function renderSurvey(survey) {
    var questions = survey.questions || [];
    var html =
      '<div style="padding:20px;">' +
      '<h3 style="margin:0 0 4px 0;font-size:16px;font-weight:600;">' +
      escapeHtml(survey.title) +
      "</h3>";

    if (survey.description) {
      html += '<p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">' +
        escapeHtml(survey.description) + "</p>";
    }

    html += '<form id="feedbacktool-form">';

    questions.forEach(function (q, i) {
      html += '<div style="margin-bottom:16px;">';
      html +=
        '<label style="display:block;font-size:13px;font-weight:500;margin-bottom:6px;">' +
        escapeHtml(q.text) +
        (q.required ? ' <span style="color:#ef4444;">*</span>' : "") +
        "</label>";

      if (q.type === "open_text") {
        html +=
          '<textarea name="q_' + q.id + '" ' +
          (q.required ? "required " : "") +
          'style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;' +
          'font-size:13px;min-height:60px;resize:vertical;box-sizing:border-box;" ' +
          'placeholder="Your answer..."></textarea>';
      } else if (q.type === "rating" || q.type === "nps") {
        var min = q.min || 0;
        var max = q.max || (q.type === "nps" ? 10 : 5);
        html += '<div style="display:flex;gap:4px;flex-wrap:wrap;">';
        for (var n = min; n <= max; n++) {
          html +=
            '<label style="cursor:pointer;">' +
            '<input type="radio" name="q_' + q.id + '" value="' + n + '" ' +
            (q.required ? "required " : "") +
            'style="display:none;">' +
            '<span class="ft-rating-btn" style="display:inline-block;width:32px;height:32px;' +
            "line-height:32px;text-align:center;border:1px solid #d1d5db;border-radius:6px;" +
            'font-size:12px;transition:all 0.15s;">' +
            n +
            "</span></label>";
        }
        html += "</div>";
      } else if (q.type === "multiple_choice" || q.type === "dropdown") {
        (q.options || []).forEach(function (opt) {
          html +=
            '<label style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:13px;cursor:pointer;">' +
            '<input type="radio" name="q_' + q.id + '" value="' + escapeHtml(opt) + '" ' +
            (q.required ? "required " : "") + ">" +
            escapeHtml(opt) +
            "</label>";
        });
      } else if (q.type === "yes_no") {
        html +=
          '<div style="display:flex;gap:8px;">' +
          '<label style="cursor:pointer;"><input type="radio" name="q_' + q.id + '" value="yes" ' +
          (q.required ? "required " : "") + "> Yes</label>" +
          '<label style="cursor:pointer;"><input type="radio" name="q_' + q.id + '" value="no" ' +
          (q.required ? "required " : "") + "> No</label>" +
          "</div>";
      }

      html += "</div>";
    });

    html +=
      '<button type="submit" style="width:100%;background:' +
      config.primaryColor +
      ";color:white;border:none;padding:10px;border-radius:6px;" +
      'cursor:pointer;font-size:14px;font-weight:500;">Submit</button>';
    html += "</form></div>";

    panel.innerHTML = html;

    // Handle rating button styling
    panel.addEventListener("change", function (e) {
      var target = e.target;
      if (target.type === "radio") {
        var name = target.name;
        var buttons = panel.querySelectorAll('input[name="' + name + '"]');
        buttons.forEach(function (btn) {
          var span = btn.nextElementSibling;
          if (span) {
            if (btn.checked) {
              span.style.background = config.primaryColor;
              span.style.color = "white";
              span.style.borderColor = config.primaryColor;
            } else {
              span.style.background = "white";
              span.style.color = "#374151";
              span.style.borderColor = "#d1d5db";
            }
          }
        });
      }
    });

    // Handle form submission
    var form = panel.querySelector("#feedbacktool-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var formData = new FormData(form);
      var answers = {};
      formData.forEach(function (value, key) {
        if (key.startsWith("q_")) {
          answers[key.replace("q_", "")] = value;
        }
      });

      submitResponse(answers);
    });
  }

  function submitResponse(answers) {
    var submitBtn = panel.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    fetch(config.apiUrl + "/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        survey_id: config.surveyId,
        answers: answers,
        metadata: {
          page_url: window.location.href,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        },
        consent: true,
      }),
    })
      .then(function (res) {
        if (res.ok) {
          panel.innerHTML =
            '<div style="padding:40px 24px;text-align:center;">' +
            '<div style="font-size:32px;margin-bottom:8px;">&#x2705;</div>' +
            '<p style="font-size:14px;font-weight:500;color:#059669;">Thank you for your feedback!</p>' +
            "</div>";
          setTimeout(function () {
            isOpen = false;
            panel.style.display = "none";
          }, 3000);
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit";
          alert("Failed to submit response. Please try again.");
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit";
        alert("Failed to submit response. Please try again.");
      });
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Assemble and add to page
  container.appendChild(panel);
  container.appendChild(button);
  document.body.appendChild(container);
})();
