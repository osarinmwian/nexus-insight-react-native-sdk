Pod::Spec.new do |s|
  s.name         = "NexusInsightPro"
  s.version      = "1.0.0"
  s.summary      = "Enterprise-grade React Native analytics SDK"
  s.description  = "Zero-dependency analytics SDK with encrypted storage and crash reporting"
  s.homepage     = "https://github.com/osarinmwian/nexus-insight"
  s.license      = "MIT"
  s.author       = { "osarinmwian" => "osarinmwian@github.com" }
  s.platform     = :ios, "9.0"
  s.source       = { :git => "https://github.com/osarinmwian/nexus-insight.git", :tag => "v#{s.version}" }
  s.source_files = "lib/**/*.{h,m,js}"
  s.requires_arc = true
  s.dependency "React"
end