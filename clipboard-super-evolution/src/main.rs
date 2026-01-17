// Prevent console window on Windows
#![windows_subsystem = "windows"]

//! Clipboard Super Evolution - AI-powered clipboard manager
//! Version: 0.2.0

mod clipboard;
mod analyzer;
mod actions;
mod icon;
mod settings;

use eframe::egui::{self, FontData, FontDefinitions, FontFamily};
use std::sync::{Arc, Mutex};
use std::thread;
use arboard::Clipboard;
use crate::analyzer::{ContentAnalyzer, ContentType, SuggestedAction};
use crate::settings::AppSettings;

const VERSION: &str = "0.2.0";

fn main() -> eframe::Result&lt;()&gt; {
    // Initialize logging
    tracing_subscriber::fmt::init();

    println!("🚀 Clipboard Super Evolution v{}", VERSION);

    // Load settings
    let settings = AppSettings::load();
    let start_minimized = settings.start_minimized;

    // Generate icon
    let icon_image = icon::generate_icon_64();
    let icon_data = icon::to_icon_data(&amp;icon_image);

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([400.0, 500.0])
            .with_min_inner_size([300.0, 400.0])
            .with_title(format!("Clipboard Super Evolution v{}", VERSION))
            .with_icon(std::sync::Arc::new(icon_data))
            .with_visible(!start_minimized),
        ..Default::default()
    };

    eframe::run_native(
        "Clipboard Super Evolution",
        options,
        Box::new(move |cc| {
            // Configure Japanese fonts
            setup_custom_fonts(&amp;cc.egui_ctx);
            Ok(Box::new(ClipboardApp::new(cc, settings)))
        }),
    )
}

fn setup_custom_fonts(ctx: &amp;egui::Context) {
    let mut fonts = FontDefinitions::default();

    // Try to load Windows Japanese fonts
    let font_paths = [
        "C:/Windows/Fonts/meiryo.ttc",      // Meiryo
        "C:/Windows/Fonts/msgothic.ttc",    // MS Gothic
        "C:/Windows/Fonts/YuGothM.ttc",     // Yu Gothic
        "C:/Windows/Fonts/msmincho.ttc",    // MS Mincho
    ];

    let mut font_loaded = false;

    for font_path in &amp;font_paths {
        if let Ok(font_data) = std::fs::read(font_path) {
            fonts.font_data.insert(
                "japanese_font".to_owned(),
                FontData::from_owned(font_data).into(),
            );

            // Add Japanese font to proportional family (primary)
            fonts
                .families
                .entry(FontFamily::Proportional)
                .or_default()
                .insert(0, "japanese_font".to_owned());

            // Also add to monospace for code
            fonts
                .families
                .entry(FontFamily::Monospace)
                .or_default()
                .insert(0, "japanese_font".to_owned());

            println!("✅ Loaded Japanese font: {}", font_path);
            font_loaded = true;
            break;
        }
    }

    if !font_loaded {
        println!("⚠️ No Japanese font found, using default");
    }

    ctx.set_fonts(fonts);
}

struct ClipboardEntry {
    content: String,
    content_type: ContentType,
    actions: Vec&lt;SuggestedAction&gt;,
    timestamp: String,
}

struct ClipboardApp {
    history: Arc&lt;Mutex&lt;Vec&lt;ClipboardEntry&gt;&gt;&gt;,
    search_query: String,
    show_settings: bool,
    settings: AppSettings,
    status_message: Option&lt;(String, std::time::Instant)&gt;,
}

impl ClipboardApp {
    fn new(_cc: &amp;eframe::CreationContext&lt;'_&gt;, settings: AppSettings) -&gt; Self {
        let history = Arc::new(Mutex::new(Vec::new()));
        let history_clone = history.clone();
        let monitor_interval = settings.monitor_interval_ms;
        let history_max = settings.history_max;

        // Start clipboard monitoring in background thread
        thread::spawn(move || {
            let analyzer = ContentAnalyzer::new();
            let mut clipboard = match Clipboard::new() {
                Ok(c) =&gt; c,
                Err(e) =&gt; {
                    eprintln!("Failed to access clipboard: {}", e);
                    return;
                }
            };
            let mut last_content = String::new();

            loop {
                if let Ok(text) = clipboard.get_text() {
                    if !text.is_empty() &amp;&amp; text != last_content {
                        let content_type = analyzer.analyze(&amp;text);
                        let actions = analyzer.suggest_actions(&amp;content_type, &amp;text);

                        let entry = ClipboardEntry {
                            content: text.clone(),
                            content_type,
                            actions,
                            timestamp: chrono_now(),
                        };

                        if let Ok(mut h) = history_clone.lock() {
                            h.insert(0, entry);
                            // Keep only last N entries
                            while h.len() &gt; history_max {
                                h.pop();
                            }
                        }

                        last_content = text;
                    }
                }
                thread::sleep(std::time::Duration::from_millis(monitor_interval));
            }
        });

        Self {
            history,
            search_query: String::new(),
            show_settings: false,
            settings,
            status_message: None,
        }
    }

    fn set_status(&amp;mut self, message: &amp;str) {
        self.status_message = Some((message.to_string(), std::time::Instant::now()));
    }
}

fn chrono_now() -&gt; String {
    use std::time::SystemTime;
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    // Adjust for JST (UTC+9)
    let jst_secs = secs + 9 * 3600;
    let hours = (jst_secs / 3600) % 24;
    let mins = (jst_secs / 60) % 60;
    let s = jst_secs % 60;
    format!("{:02}:{:02}:{:02}", hours, mins, s)
}

impl eframe::App for ClipboardApp {
    fn update(&amp;mut self, ctx: &amp;egui::Context, _frame: &amp;mut eframe::Frame) {
        // Request repaint periodically to update UI
        ctx.request_repaint_after(std::time::Duration::from_millis(500));

        // Clear status message after 3 seconds
        if let Some((_, time)) = &amp;self.status_message {
            if time.elapsed() &gt; std::time::Duration::from_secs(3) {
                self.status_message = None;
            }
        }

        egui::TopBottomPanel::top("header").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.heading("📋 Clipboard Super Evolution");
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui.button("⚙").clicked() {
                        self.show_settings = !self.show_settings;
                    }
                });
            });
            ui.add_space(5.0);
            ui.horizontal(|ui| {
                ui.label("🔍");
                ui.add(egui::TextEdit::singleline(&amp;mut self.search_query)
                    .hint_text("履歴を検索..."));
            });
        });

        if self.show_settings {
            egui::Window::new("設定")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
                .show(ctx, |ui| {
                    ui.heading("⚙️ 設定");
                    ui.separator();

                    ui.add_space(10.0);

                    // Startup settings section
                    ui.group(|ui| {
                        ui.label("🚀 起動設定");
                        ui.add_space(5.0);

                        // Startup registration toggle
                        let mut startup_enabled = self.settings.startup_enabled;
                        if ui.checkbox(&amp;mut startup_enabled, "Windows起動時に自動起動").changed() {
                            match self.settings.set_startup_enabled(startup_enabled) {
                                Ok(_) =&gt; {
                                    let msg = if startup_enabled {
                                        "✅ スタートアップに登録しました"
                                    } else {
                                        "✅ スタートアップから削除しました"
                                    };
                                    self.set_status(msg);
                                }
                                Err(e) =&gt; {
                                    self.set_status(&amp;format!("❌ エラー: {}", e));
                                    // Revert on error
                                    self.settings.startup_enabled = !startup_enabled;
                                }
                            }
                        }
                        ui.label("  └ PCを起動したときに自動でアプリを起動します");

                        ui.add_space(5.0);

                        // Start minimized toggle
                        let mut start_minimized = self.settings.start_minimized;
                        if ui.checkbox(&amp;mut start_minimized, "最小化状態で起動").changed() {
                            match self.settings.set_start_minimized(start_minimized) {
                                Ok(_) =&gt; {
                                    self.set_status("✅ 設定を保存しました");
                                }
                                Err(e) =&gt; {
                                    self.set_status(&amp;format!("❌ エラー: {}", e));
                                    self.settings.start_minimized = !start_minimized;
                                }
                            }
                        }
                        ui.label("  └ ウィンドウを非表示で起動します");
                    });

                    ui.add_space(10.0);

                    // Info section
                    ui.group(|ui| {
                        ui.label("ℹ️ 情報");
                        ui.add_space(5.0);
                        ui.label(format!("履歴上限: {} 件", self.settings.history_max));
                        ui.label(format!("監視間隔: {} ms", self.settings.monitor_interval_ms));
                    });

                    ui.add_space(10.0);

                    // Status message
                    if let Some((msg, _)) = &amp;self.status_message {
                        ui.colored_label(
                            if msg.starts_with("✅") {
                                egui::Color32::from_rgb(100, 200, 100)
                            } else {
                                egui::Color32::from_rgb(255, 100, 100)
                            },
                            msg,
                        );
                        ui.add_space(5.0);
                    }

                    ui.separator();
                    ui.horizontal(|ui| {
                        if ui.button("閉じる").clicked() {
                            self.show_settings = false;
                        }
                    });
                });
        }

        egui::CentralPanel::default().show(ctx, |ui| {
            egui::ScrollArea::vertical().show(ui, |ui| {
                let history = self.history.lock().unwrap();
                let filtered: Vec&lt;_&gt; = history.iter()
                    .filter(|e| {
                        self.search_query.is_empty() ||
                        e.content.to_lowercase().contains(&amp;self.search_query.to_lowercase())
                    })
                    .collect();

                if filtered.is_empty() {
                    ui.vertical_centered(|ui| {
                        ui.add_space(50.0);
                        ui.label("📋 クリップボード履歴がありません");
                        ui.label("何かをコピーしてください！");
                    });
                } else {
                    for entry in filtered {
                        ui.group(|ui| {
                            // Header with type and timestamp
                            ui.horizontal(|ui| {
                                let (type_icon, type_label) = match &amp;entry.content_type {
                                    ContentType::Url =&gt; ("🌐", "URL"),
                                    ContentType::Email =&gt; ("📧", "メール"),
                                    ContentType::Phone =&gt; ("📞", "電話番号"),
                                    ContentType::Address =&gt; ("🗺️", "住所"),
                                    ContentType::Code(lang) =&gt; ("💻", lang.as_str()),
                                    ContentType::English =&gt; ("🔤", "英語"),
                                    ContentType::Japanese =&gt; ("🇯🇵", "日本語"),
                                    ContentType::Mixed =&gt; ("🌏", "混合"),
                                    ContentType::Unknown =&gt; ("📝", "テキスト"),
                                };
                                ui.label(type_icon);
                                ui.label(type_label);
                                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                    ui.small(&amp;entry.timestamp);
                                });
                            });

                            // Content preview
                            let preview = if entry.content.chars().count() &gt; 100 {
                                format!("{}...", entry.content.chars().take(100).collect::&lt;String&gt;())
                            } else {
                                entry.content.clone()
                            };
                            ui.label(&amp;preview);

                            // Action buttons
                            ui.horizontal(|ui| {
                                for action in &amp;entry.actions {
                                    let label = match action.label.as_str() {
                                        "Open in Browser" =&gt; "ブラウザで開く",
                                        "Open in Google Maps" =&gt; "マップで開く",
                                        "Translate to Japanese" =&gt; "翻訳",
                                        "Compose email" =&gt; "メール作成",
                                        "Call this number" =&gt; "電話する",
                                        "Save to favorites" =&gt; "お気に入り",
                                        _ =&gt; &amp;action.label,
                                    };
                                    if ui.small_button(format!("{} {}", action.icon, label)).clicked() {
                                        if let Some(url) = &amp;action.url {
                                            let _ = open::that(url);
                                        }
                                    }
                                }
                                if ui.small_button("📋 コピー").clicked() {
                                    if let Ok(mut clipboard) = Clipboard::new() {
                                        let _ = clipboard.set_text(&amp;entry.content);
                                    }
                                }
                            });
                        });
                        ui.add_space(5.0);
                    }
                }
            });
        });

        egui::TopBottomPanel::bottom("footer").show(ctx, |ui| {
            ui.horizontal(|ui| {
                let history_len = self.history.lock().map(|h| h.len()).unwrap_or(0);
                ui.label(format!("📚 {} 件", history_len));
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.small(format!("v{}", VERSION));
                });
            });
        });
    }
}
