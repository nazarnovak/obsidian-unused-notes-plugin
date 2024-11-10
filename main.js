const { Modal, Plugin, PluginSettingTab, Setting } = require("obsidian");
const import_obsidian2 = require("obsidian");
const import_obsidian8 = require("obsidian");
const path = require("path");

// Modal that shows button to pick a random unused note + unused notes list
class UnusedNotesModal extends Modal {
  constructor(app, pluginData, saveData) {
    super(app);
    this.settings = pluginData.settings;
    this.allNotes = pluginData.unusedNotes;
    this.saveData = saveData;
  }

  randomFromInterval(min, max) {
    // Get the weight of probability first
    const weight = Math.random();

    const weightedMax = Math.floor(max / 3) * 2;
    const weightedMin = min + weightedMax;

    // If probability is first 2/3rds - select first 2/3rds of the list
    if (weight < 0.66) {
      return Math.floor(Math.random() * (weightedMax - min) + min);
    }

    // min included, max excluded
    return Math.floor(Math.random() * (max - weightedMin) + weightedMin);
  }

  // Sort by access time + natural sorting for file names
  sortByDate(a, b) {
    if (a.lastAccessed === b.lastAccessed) {
      return a.filename.localeCompare(b.filename, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    if (!a.lastAccessed) {
      return -1;
    }

    if (!b.lastAccessed) {
      return 1;
    }

    return Date.parse(a.lastAccessed) - Date.parse(b.lastAccessed);
  }

  // Sort by reversed access time + natural sorting for file names
  sortByDateReversed(a, b) {
    if (a.lastAccessed === b.lastAccessed) {
      return a.filename.localeCompare(b.filename, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    if (!a.lastAccessed) {
      return -1;
    }

    if (!b.lastAccessed) {
      return 1;
    }

    return Date.parse(b.lastAccessed) - Date.parse(a.lastAccessed);
  }

  isToday(date) {
    const today = new Date();

    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  getAccessedToday(notes) {
    let accessedToday = [];

    for (const key in notes) {
      if (this.allNotes[key].ignored) {
        continue;
      }

      const lastAccessed = notes[key].lastAccessed === "" ? 0 : notes[key].lastAccessed;

      const accessedDate = new Date(lastAccessed);

      if (!this.isToday(accessedDate)) {
        continue;
      }

      accessedToday.push(notes[key]);
    }

    return accessedToday;
  }

  isThisWeek(datetime) {
    const today = new Date();

    // Get the current day of the week (0 for Sunday, 6 for Saturday)
    let dayOfWeek = today.getDay();

    // Adjust dayOfWeek to make Monday the start of the week
    // 0 (Sunday) should become 6, and all others should shift by -1
    dayOfWeek = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;

    // Calculate start and end of the week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek); // Set to the previous Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Set to the next Sunday (end of the week)
    endOfWeek.setHours(23, 59, 59, 999);

    // Adjust +1 hours for Sweden time
    // datetime.setHours(datetime.getHours() + 1);

    if (datetime.getFullYear() === 1970) {
      return false;
    }

    // Check if the date is within this range
    return datetime >= startOfWeek && datetime <= endOfWeek;
  }

  getAccessedThisWeek(notes) {
    let accessedThisWeek = [];

    for (const key in notes) {
      if (this.allNotes[key].ignored) {
        continue;
      }

      const lastAccessed = notes[key].lastAccessed === "" ? 0 : notes[key].lastAccessed;

      const accessedDate = new Date(lastAccessed);

      if (!this.isThisWeek(accessedDate)) {
        continue;
      }

      accessedThisWeek.push(notes[key]);
    }

    return accessedThisWeek;
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.empty();
    contentEl.classList.add("unused-notes-modal");

    let accessedToday = this.getAccessedToday(this.allNotes);
    let accessedThisWeek = this.getAccessedThisWeek(this.allNotes);

    let reviewNeededNotes = [];
    let reviewedNotes = [];

    let now = Date.now();
    for (const key in this.allNotes) {
      // Note is ignored - we don't want to keep track of it
      if (this.allNotes[key].ignored) {
        continue;
      }

      // No last access date - add it to array first
      if (!this.allNotes[key].lastAccessed) {
        reviewNeededNotes.push(this.allNotes[key]);
        continue;
      }

      let noteAccessedDate = Date.parse(this.allNotes[key].lastAccessed);
      let noteAccessedTimeAgo = now - noteAccessedDate;
      let noteAccessedDaysAgo = noteAccessedTimeAgo / (1000 * 60 * 60 * 24);
      // If we reviewed this note within the UNUSED_DAYS_LIMIT - skip it and don't review it
      if (
        noteAccessedDaysAgo <= this.settings.UNUSED_DAYS_LIMIT
      ) {
        reviewedNotes.push(this.allNotes[key]);
        continue;
      }

      reviewNeededNotes.push(this.allNotes[key]);
    }

    if (!reviewNeededNotes.length) {
      var h1 = contentEl.createEl("h1");
      h1.classList.add("unused-heading");
      h1.setText("All notes are used :)");
      return;
    }

    reviewNeededNotes.sort(this.sortByDate);
    reviewedNotes.sort(this.sortByDateReversed);

    new import_obsidian8.Setting(contentEl)
      .setName("Open a random unused note from list below")
      .setDesc(
        "Picks a random note from the list and opens it (this dialog will be closed)."
      )
      .addButton((cb) => {
        cb.setButtonText("Open a random unused note");
        cb.setCta();
        cb.onClick(() => {
          // randomFromInterval is weighted here. It's twice more likely to pick a note from first 2/3rds
          const randomNoteIndex = this.randomFromInterval(0, reviewNeededNotes.length);

          // I want the oldest 2/3rds of the notes to be higher prio. If there are for example 5 unused notes that were
          // never opened, and some that were opened on expiration time + 3 days - never should always have higher chance
          // of being opened

          const randomUnusedFile = reviewNeededNotes[randomNoteIndex];

          // No need for this anymore, since number of unused notes is always available in the dialog now
          //     new Notice("Unused notes left:" + reviewNeededNotes.length, 3000);
          this.app.workspace.openLinkText(
            randomUnusedFile.filename,
            "",
            "tab",
            {
              active: true,
            }
          );
          this.close();
        });
      });

    var info = contentEl.createEl("div");
    info.classList.add("unused-notes-count");

    let totalP = contentEl.createEl("p");
    totalP.classList.add("unused-notes-info-paragraph");
    const totalPText = "Total unused notes count: " + reviewNeededNotes.length;
    totalP.setText(totalPText);
    info.appendChild(totalP);

    var goalsProgressBarsDiv = contentEl.createEl("div");
    goalsProgressBarsDiv.classList.add("unused-notes-goals");

    let reviewGoalP = contentEl.createEl("p");
    reviewGoalP.classList.add("unused-notes-info-paragraph");
    const reviewGoalText = "Review goals [need>done]";
    reviewGoalP.setText(reviewGoalText);

    let reviewGoalValuesP = contentEl.createEl("p");
    reviewGoalValuesP.classList.add("unused-notes-info-paragraph");
      const reviewGoalValuesText = "Weekly: " + this.settings.WEEKLY_REVIEW_COUNT 
      + ">" + Object.values(accessedThisWeek).length + ". Daily: " 
      + Math.ceil(this.settings.WEEKLY_REVIEW_COUNT / 7) + ">" + Object.values(accessedToday).length;
      reviewGoalValuesP.setText(reviewGoalValuesText);

    info.appendChild(reviewGoalP);
    info.appendChild(reviewGoalValuesP);

    // Visual progress bars for better visualization
    let progressContainer1 = contentEl.createEl("div");
    progressContainer1.classList.add("unused-notes-goals-progress-container");

    const progressWeeksAmount = (Object.values(accessedThisWeek).length / this.settings.WEEKLY_REVIEW_COUNT * 100) >= 100 ? 100 : (Object.values(accessedThisWeek).length / this.settings.WEEKLY_REVIEW_COUNT * 100);
    const progressDaysAmount = (Object.values(accessedToday).length / Math.ceil(this.settings.WEEKLY_REVIEW_COUNT / 7) * 100) >= 100 ? 100 : (Object.values(accessedToday).length / Math.ceil(this.settings.WEEKLY_REVIEW_COUNT / 7) * 100);

    let progressBar1 = contentEl.createEl("div");
    progressBar1.classList.add("unused-notes-goals-progress-bar");
    progressBar1.style.cssText = "width: " + progressWeeksAmount  + "%";

    let progressContainer2 = contentEl.createEl("div");
    progressContainer2.classList.add("unused-notes-goals-progress-container");

    let progressBar2 = contentEl.createEl("div");
    progressBar2.classList.add("unused-notes-goals-progress-bar");
    progressBar2.style.cssText = "width: " + progressDaysAmount + "%";

    progressContainer1.appendChild(progressBar1);
    progressContainer2.appendChild(progressBar2);
    goalsProgressBarsDiv.appendChild(progressContainer1);
    goalsProgressBarsDiv.appendChild(progressContainer2);
    info.appendChild(goalsProgressBarsDiv);

    // Show last 10 reviewed notes dropdown (so it doesn't take a lot of space)
    let reviewedList = contentEl.createEl("p");
    reviewedList.classList.add("unused-notes-info-paragraph");
    const reviewListText = "Recently reviewed notes list";
    reviewedList.setText(reviewListText);

    // Create the <select> element
    const select = document.createElement("select");
    // Loop through the array to create <option> elements
    reviewedNotes.slice(0, 10).forEach((item, index) => {
      const option = document.createElement("option");
      option.textContent = item.filename + " - " + item.lastAccessed;
      option.disabled = true;  // Disable each <option>

      // Set the first option as selected
      if (index === 0) {
        option.selected = true;
      }

      // Append the <option> to the <select>
      select.appendChild(option);
    });

    // Append the <select> to the document (e.g., body or another container)
    info.appendChild(reviewedList);
    info.appendChild(select);

    // Show a list of notes with links that needs reviewing
    let headerText = "Never used";
    // If first note was never accessed - show that heading. Otherwise show the date
    if (reviewNeededNotes[0].lastAccessed) {
      let lastAccessedDate = new Date(Date.parse(reviewNeededNotes[0].lastAccessed));
      headerText = lastAccessedDate.toISOString().split("T")[0];
    }

    var h1 = contentEl.createEl("h1");
    h1.classList.add("unused-heading");
    h1.setText(headerText);

    let temporaryDate = "";
    let previousDate = "";
    let currentDate = "";

    for (const key in reviewNeededNotes) {
      if (reviewNeededNotes[key].lastAccessed) {
        temporaryDate = new Date(Date.parse(reviewNeededNotes[key].lastAccessed));
        currentDate = temporaryDate.toISOString().split("T")[0];

        // So "Never accessed" notes are grouped together + change heading for every new unique date
        if (currentDate !== previousDate) {
          var h1 = contentEl.createEl("h1");
          h1.classList.add("unused-heading");
          previousDate = currentDate;
          h1.setText(currentDate);
        }
      }

      const noteDiv = contentEl.createDiv("unused-note");
      noteDiv.setAttribute("id", "never-" + key);

      const linksDiv = contentEl.createDiv();

      const ignoreLink = document.createElement("a");
      ignoreLink.setText(`[X]`);
      ignoreLink.classList.add("unused-note-ignore");
      ignoreLink.href = "javascript:void(0);"; // Set a dummy href
      ignoreLink.addEventListener("click", () => {
        if (!this.allNotes[reviewNeededNotes[key].filename]) {
          console.log(
            "Failed to find a note with path:",
            reviewNeededNotes[key].filename
          );
          return;
        }

        this.allNotes[reviewNeededNotes[key].filename].ignored = true;
        this.saveData(this.allNotes);

        var elem = document.getElementById("never-" + key);
        elem.parentNode.removeChild(elem);
      });

      const noteLink = document.createElement("a");
      noteLink.setText(`${reviewNeededNotes[key].filename}`);
      noteLink.href = "javascript:void(0);"; // Set a dummy href
      noteLink.addEventListener("click", () => {
        this.app.workspace.openLinkText(reviewNeededNotes[key].filename, "", "tab", {
          active: true,
        });
        this.close();
      });
      linksDiv.appendChild(ignoreLink);
      linksDiv.appendChild(noteLink);
      noteDiv.appendChild(linksDiv);
    }
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

class UnusedNotesSettingsTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Number of days, after which the note becomes unusued")
      .setDesc(
        "The amount of days, that will mark the note as unused, and adding it to the list of unused notes"
      )
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.pluginData.settings.UNUSED_DAYS_LIMIT)
          .onChange(async (value) => {
            this.plugin.pluginData.settings.UNUSED_DAYS_LIMIT = value;
            await this.plugin.saveSettings();
          })
      );
      new Setting(containerEl)
      .setName("Weekly review notes amount")
      .setDesc(
        "Specify how many notes per week you want to review"
      )
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.pluginData.settings.WEEKLY_REVIEW_COUNT)
          .onChange(async (value) => {
            this.plugin.pluginData.settings.WEEKLY_REVIEW_COUNT = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

// Main Plugin class
class UnusedNotesTrackerPlugin extends Plugin {
  constructor(app, manifest) {
    super(app, manifest);
    this.pluginData = {
      unusedNotes: {},
      settings: {},
    };
  }

  saveSettings() {
    this.saveData(this.pluginData);
  }

  onload = async () => {
    this.loadUnusedNotesData()
      .then((pluginData) => {
        this.addSettingTab(new UnusedNotesSettingsTab(this.app, this));

        this.addRibbonIcon("clock", "Unused Notes", () => {
          // Called when the user clicks the icon.
          this.loadUnusedNotesData()
            .then((pluginData) => {
              this.pluginData = pluginData;
              this.displayUnusedNotes(pluginData);
            }
          );
        });

        this.registerEvent(
          this.app.workspace.on("file-menu", (menu, file) => {
            // It assumes now that files have basename, and folders don't. So skip folders
            if (
              !file.basename ||
              this.pluginData.unusedNotes[file.path] === undefined
            ) {
              return;
            }

            const addEnableIgnoreUnusedNoteMenuItem = (item) => {
              const ignored = this.pluginData.unusedNotes[file.path].ignored;

              item.setTitle(
                ignored ? "Enable usage tracking" : "Disable usage tracking"
              );
              item.setIcon(ignored ? "checkmark" : "cross");
              item.onClick(() => {
                this.pluginData.unusedNotes[file.path] = {
                  ...this.pluginData.unusedNotes[file.path],
                  ignored: !this.pluginData.unusedNotes[file.path].ignored,
                };
                this.saveData(this.pluginData);
              });
            };
            menu.addItem(addEnableIgnoreUnusedNoteMenuItem);
          })
        );

        this.registerEvent(
          this.app.workspace.on("file-menu", (menu, file) => {
            // It assumes now that files have basename, and folders don't. So skip folders
            if (
              !file.basename ||
              this.pluginData.unusedNotes[file.path] === undefined
            ) {
              return;
            }

            // We don't care about resetting access time for ignored files or if note already has it as 0
            if (
              this.pluginData.unusedNotes[file.path].ignored ||
              !this.pluginData.unusedNotes[file.path].lastAccessed
            ) {
              return;
            }

            const addResetLastAccessMenuItem = (item) => {
              item.setTitle("Reset usage");
              item.setIcon("redo-glyph");
              item.onClick(() => {
                this.pluginData.unusedNotes[file.path] = {
                  ...this.pluginData.unusedNotes[file.path],
                  lastAccessed: "",
                };
                this.saveData(this.pluginData);
              });
            };
            menu.addItem(addResetLastAccessMenuItem);
          })
        );

        this.registerEvent(
          this.app.workspace.on("file-open", (file) => {
            // If file is closed - it gives null
            if (!file) {
              return;
            }

            this.updateLastAccessTime(file.path);
          })
        );

        this.registerEvent(
          this.app.vault.on("create", (file) => {
            this.handleFileCreated(file);
          })
        );

        this.registerEvent(
          this.app.vault.on("rename", (file, oldname) => {
            // If file is closed - it gives null
            if (!file) {
              return;
            }

            // Handle delete to change data.json
            this.handleFileRenamed(oldname, file);
          })
        );

        this.registerEvent(
          this.app.vault.on("delete", (file) => {
            // If file is closed - it gives null
            if (!file) {
              return;
            }

            // Handle delete to change data.json
            this.handleFileDeleted(file);
          })
        );
      })
      .catch((err) => console.log("Oopsie happened:", err));
  };

  loadUnusedNotesData() {
    // Don't load unusedNotes from memory - always load from file. This fixes sync issues from the phone
    // if (this.pluginData.unusedNotes) {
    //   Promise.resolve(this.pluginData.unusedNotes);
    // }

    return this.loadData()
      .then((data) => {
        // File already contains something - return it
        if (data) {
          // This is needed so it's local. Less opening of the file
          this.pluginData = data;
          return data;
        }

        // Data file doesn't exist - create it
        let unusedNotesData = {};

        for (const key in this.app.vault.fileMap) {
          // It assumes now that files have basename, and folders don't. So skip folders
          if (!this.app.vault.fileMap[key].basename) {
            continue;
          }

          const dotParts = key.split(".");
          const extension = dotParts[dotParts.length - 1];
          if (!extension) {
            // Doesn't have an extension - folder probably
            continue;
          }

          unusedNotesData[key] = {
            filename: key,
            ignored: false,
            lastAccessed: "",
          };
        }

        // This is needed so it's local. Less opening of the file
        this.pluginData = {
          settings: { UNUSED_DAYS_LIMIT: 90 },
          unusedNotes: unusedNotesData,
        };

        this.saveData(this.pluginData);

        return this.pluginData;
      })
      .catch((err) => {
        throw "Error loading data.json: " + err;
      });
  }

  handleFileCreated(file) {
    // On start-up, Obsidian fires a "create" event for every folder in the vault, so we need to skip those
    // + check if file already exists in unused notes we already loaded into memory
    if (!file.basename || this.pluginData.unusedNotes[file.path]) {
      return;
    }

    this.pluginData.unusedNotes[file.path] = {
      filename: file.path,
      ignored: false,
      lastAccessed: "",
    };

    this.saveData(this.pluginData);
  }

  handleFileRenamed(oldname, file) {
    if (!this.pluginData.unusedNotes[oldname]) {
      console.log("Could not find file to rename:", oldname);
      return;
    }

    this.pluginData.unusedNotes[file.path] = {
      filename: file.path,
      ignored: this.pluginData.unusedNotes[oldname].ignored,
      lastAccessed: this.pluginData.unusedNotes[oldname].lastAccessed,
    };

    delete this.pluginData.unusedNotes[oldname];

    this.saveData(this.pluginData);
  }

  handleFileDeleted(file) {
    delete this.pluginData.unusedNotes[file.path];

    this.saveData(this.pluginData);
  }

  updateLastAccessTime(filePath) {
    const { ignored } = this.pluginData.unusedNotes[filePath];
    if (ignored) {
      return;
    }

    const now = new Date().toISOString();
    this.pluginData.unusedNotes[filePath] = {
      ...this.pluginData.unusedNotes[filePath],
      lastAccessed: now,
    };

    this.saveData(this.pluginData);
  }

  displayUnusedNotes(pluginData) {
    const modal = new UnusedNotesModal(app, pluginData, (data) => {
      this.saveData(data);
    });
    modal.open();
  }
}

module.exports = UnusedNotesTrackerPlugin;
