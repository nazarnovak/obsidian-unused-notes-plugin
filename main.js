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

  compareNotes(a, b) {
    if (a.note < b.note) {
      return -1;
    }
    if (a.note > b.note) {
      return 1;
    }
    return 0;
  }

  randomFromInterval(min, max) {
    // min included, max excluded
    return Math.floor(Math.random() * (max - min) + min);
  }

  sortByDate(a, b) {
    if (a.lastAccessed === b.lastAccessed) {
      if (a.filename < b.filename) {
        return -1;
      } else if (a.filename > b.filename) {
        return 1;
      }
      return 0;
    }

    if (!a.lastAccessed) {
      return -1;
    }

    if (!b.lastAccessed) {
      return 1;
    }

    return Date.parse(a.lastAccessed) - Date.parse(b.lastAccessed);
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.empty();
    contentEl.classList.add("unused-notes-modal");

    let arrNotes = [];
    let now = Date.now();
    for (const key in this.allNotes) {
      if (this.allNotes[key].ignored) {
        continue;
      }

      // No last access date - add it to array immediately
      if (!this.allNotes[key].lastAccessed) {
        arrNotes.push(this.allNotes[key]);
        continue;
      }

      let lastAccessedDate = Date.parse(this.allNotes[key].lastAccessed);
      let timeDiff = now - lastAccessedDate;
      let daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      if (
        this.allNotes[key].ignored ||
        daysDiff <= this.settings.UNUSED_DAYS_LIMIT
      ) {
        continue;
      }

      arrNotes.push(this.allNotes[key]);
    }

    if (!arrNotes.length) {
      var h1 = contentEl.createEl("h1");
      h1.classList.add("unused-heading");
      h1.setText("All notes are used :)");
      return;
    }

    arrNotes.sort(this.sortByDate);

    new import_obsidian8.Setting(contentEl)
      .setName("Open a random unused note from list below")
      .setDesc(
        "Picks a random note from the list and opens it (this dialog will be closed)."
      )
      .addButton((cb) => {
        cb.setButtonText("Open unused note");
        cb.setCta();
        cb.onClick(() => {
          // If it's less than 100 notes - then use that amount to random from
          const max = arrNotes.length > 100 ? 100 : arrNotes.length;

          const randomNoteIndex = this.randomFromInterval(0, max);

          const randomUnusedFile = arrNotes[randomNoteIndex];

          new Notice("Unused notes left:" + arrNotes.length, 3000);
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

    let headerText = "Never used";
    // If first note was never accessed - show that heading. Otherwise show the date
    if (arrNotes[0].lastAccessed) {
      let lastAccessedDate = new Date(Date.parse(note.lastAccessed));
      headerText = lastAccessedDate.toISOString().split("T")[0];
    }

    var h1 = contentEl.createEl("h1");
    h1.classList.add("unused-heading");
    h1.setText(headerText);

    let currentDate = 0;

    for (const key in arrNotes) {
      if (arrNotes[key].lastAccessed !== currentDate) {
        let lastAccessedDate = new Date(Date.parse(arrNotes[key].lastAccessed));
        currentDate = lastAccessedDate.toISOString().split("T")[0];

        var h1 = contentEl.createEl("h1");
        h1.classList.add("unused-heading");
        h1.setText(currentDate);
      }

      const noteDiv = contentEl.createDiv("unused-note");
      noteDiv.setAttribute("id", "never-" + key);

      const linksDiv = contentEl.createDiv();

      const ignoreLink = document.createElement("a");
      ignoreLink.setText(`[X]`);
      ignoreLink.classList.add("unused-note-ignore");
      ignoreLink.href = "javascript:void(0);"; // Set a dummy href
      ignoreLink.addEventListener("click", () => {
        if (!this.allNotes[arrNotes[key].filename]) {
          console.log(
            "Failed to find a note with path:",
            arrNotes[key].filename
          );
          return;
        }

        this.allNotes[arrNotes[key].filename].ignored = true;
        this.saveData(this.allNotes);

        var elem = document.getElementById("never-" + key);
        elem.parentNode.removeChild(elem);
      });

      const noteLink = document.createElement("a");
      noteLink.setText(`${arrNotes[key].filename}`);
      noteLink.href = "javascript:void(0);"; // Set a dummy href
      noteLink.addEventListener("click", () => {
        this.app.workspace.openLinkText(arrNotes[key].filename, "", "tab", {
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

  onload() {
    this.loadUnusedNotesData()
      .then((pluginData) => {
        this.addSettingTab(new UnusedNotesSettingsTab(this.app, this));

        this.addRibbonIcon("clock", "Unused Notes", () => {
          // Called when the user clicks the icon.
          this.displayUnusedNotes(this.pluginData);
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
                  lastAccessed: 0,
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
  }

  loadUnusedNotesData() {
    if (this.pluginData.unusedNotes) {
      Promise.resolve(this.pluginData.unusedNotes);
    }

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
            lastAccessed: 0,
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

    const now = new Date().toISOString();

    this.pluginData.unusedNotes[file.path] = {
      filename: file.path,
      ignored: false,
      lastAccessed: now,
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
