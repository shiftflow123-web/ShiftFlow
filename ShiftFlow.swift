import SwiftUI

// MARK: - App Entry Point
@main
struct ShiftFlowApp: App {
    @State private var isDarkMode = false
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(isDarkMode ? .dark : .light)
                .environmentObject(AppState())
                .environmentObject(ThemeManager(isDarkMode: isDarkMode))
        }
    }
}

// MARK: - Content View
struct ContentView: View {
    @State private var selectedTab: Tab = .home
    @State private var isDarkMode = false
    @Namespace private var namespace
    @EnvironmentObject var appState: AppState
    
    enum Tab: String {
        case home = "Главная"
        case reports = "Отчёты"
        case settings = "Настройки"
    }
    
    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                gradient: Gradient(colors: [
                    isDarkMode ? Color(#colorLiteral(red: 0.08, green: 0.08, blue: 0.12, alpha: 1)) : Color(#colorLiteral(red: 0.96, green: 0.97, blue: 0.99, alpha: 1)),
                    isDarkMode ? Color(#colorLiteral(red: 0.1, green: 0.09, blue: 0.15, alpha: 1)) : Color(#colorLiteral(red: 0.95, green: 0.96, blue: 0.98, alpha: 1))
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Tab Content
                ZStack {
                    switch selectedTab {
                    case .home:
                        HomeView()
                            .transition(.asymmetric(insertion: .opacity.combined(with: .scale(scale: 0.95)), removal: .opacity))
                    case .reports:
                        ReportsView()
                            .transition(.asymmetric(insertion: .opacity.combined(with: .scale(scale: 0.95)), removal: .opacity))
                    case .settings:
                        SettingsView()
                            .transition(.asymmetric(insertion: .opacity.combined(with: .scale(scale: 0.95)), removal: .opacity))
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                
                Spacer(minLength: 0)
                
                // Liquid Glass Tab Bar
                LiquidTabBar(selectedTab: $selectedTab, namespace: namespace, isDarkMode: isDarkMode)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
            }
            .safeAreaInset(edge: .top) {
                HStack {
                    Text("ShiftFlow")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.7)) {
                            isDarkMode.toggle()
                        }
                    }) {
                        Image(systemName: isDarkMode ? "moon.fill" : "sun.max.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(isDarkMode ? .yellow : .orange)
                            .frame(width: 44, height: 44)
                            .background(
                                Circle()
                                    .fill(.ultraThinMaterial)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                    )
                            )
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.ultraThinMaterial)
            }
        }
    }
}

// MARK: - Liquid Tab Bar
struct LiquidTabBar: View {
    @Binding var selectedTab: ContentView.Tab
    let namespace: Namespace.ID
    let isDarkMode: Bool
    
    let tabs: [ContentView.Tab] = [.home, .reports, .settings]
    let colors: [ContentView.Tab: Color] = [
        .home: .cyan,
        .reports: .purple,
        .settings: .amber
    ]
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs, id: \.self) { tab in
                VStack(spacing: 6) {
                    VStack(spacing: 4) {
                        if selectedTab == tab {
                            ZStack {
                                // Glow background
                                Circle()
                                    .fill(colors[tab]!.opacity(0.2))
                                    .frame(width: 56, height: 56)
                                    .blur(radius: 8)
                                
                                // Indicator background
                                Circle()
                                    .fill(.ultraThinMaterial)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                    )
                                    .matchedGeometryEffect(id: "tabIndicator", in: namespace)
                                
                                // Wave effect
                                WaveEffect(color: colors[tab]!)
                                    .frame(width: 40, height: 40)
                                
                                // Icon
                                Image(systemName: tabIcon(for: tab))
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundColor(colors[tab])
                            }
                            .frame(height: 44)
                            .transition(.scale(scale: 1.1))
                        } else {
                            Image(systemName: tabIcon(for: tab))
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.gray)
                                .frame(height: 44)
                        }
                    }
                    
                    Text(tab.rawValue)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(selectedTab == tab ? colors[tab] : .gray)
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .onTapGesture {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.75)) {
                        selectedTab = tab
                        hapticFeedback(.soft)
                    }
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
        .cornerRadius(20)
    }
    
    private func tabIcon(for tab: ContentView.Tab) -> String {
        switch tab {
        case .home: return "house.fill"
        case .reports: return "chart.bar.fill"
        case .settings: return "gear.fill"
        }
    }
}

// MARK: - Wave Effect
struct WaveEffect: View {
    let color: Color
    @State private var phase: CGFloat = 0
    
    var body: some View {
        Canvas { context, size in
            var path = Path()
            let waveHeight: CGFloat = 2
            let frequency: CGFloat = 3
            
            for x in stride(from: 0, through: size.width, by: 1) {
                let y = size.height / 2 + sin((x + phase) * frequency * .pi / size.width) * waveHeight
                if x == 0 {
                    path.move(to: CGPoint(x: x, y: y))
                } else {
                    path.addLine(to: CGPoint(x: x, y: y))
                }
            }
            
            var strokeStyle = StrokeStyle(lineWidth: 1.5, lineCap: .round)
            context.stroke(path, with: .color(color.opacity(0.6)), style: strokeStyle)
        }
        .onAppear {
            withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                phase = CGFloat.pi * 2
            }
        }
    }
}

// MARK: - Home View
struct HomeView: View {
    @EnvironmentObject var appState: AppState
    @State private var showScheduleSheet = false
    @State private var selectedWork: Work?
    @State private var showWorkSheet = false
    @Namespace private var sheetNamespace
    
    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header with Schedule Button
                    HStack {
                        Text("Ваши работы")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        Button(action: { showScheduleSheet = true }) {
                            Image(systemName: "square.grid.2x2.fill")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.cyan)
                                .frame(width: 44, height: 44)
                                .background(
                                    Circle()
                                        .fill(.ultraThinMaterial)
                                        .overlay(
                                            Circle()
                                                .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                        )
                                )
                                .scaleEffect(0.96)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    // Works Grid
                    if appState.works.isEmpty {
                        VStack(spacing: 16) {
                            Image(systemName: "briefcase.fill")
                                .font(.system(size: 48))
                                .foregroundColor(.gray.opacity(0.5))
                            
                            Text("Добавьте работу в настройках")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.gray)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 300)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(.ultraThinMaterial)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                        )
                        .padding(.horizontal, 20)
                    } else {
                        VStack(spacing: 16) {
                            ForEach(appState.works, id: \.id) { work in
                                WorkCard(work: work)
                                    .onTapGesture {
                                        selectedWork = work
                                        showWorkSheet = true
                                    }
                                    .transition(.asymmetric(
                                        insertion: .scale(scale: 0.8).combined(with: .opacity),
                                        removal: .scale(scale: 0.5).combined(with: .opacity)
                                    ))
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    Spacer(minLength: 40)
                }
            }
            
            // Bottom Sheet for Work Details
            if showWorkSheet, let work = selectedWork {
                VStack {
                    Spacer()
                    
                    VStack(spacing: 20) {
                        // Handle
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.gray.opacity(0.4))
                            .frame(width: 40, height: 4)
                            .padding(.top, 8)
                        
                        Text(work.name)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.primary)
                        
                        if work.rateType == .hourly {
                            HourlyWorkSheet(work: work)
                        } else {
                            FixedWorkSheet(work: work)
                        }
                        
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 400)
                    .background(.ultraThinMaterial)
                    .cornerRadius(28)
                    .overlay(
                        RoundedRectangle(cornerRadius: 28)
                            .stroke(Color.white.opacity(0.15), lineWidth: 1)
                    )
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
                .onTapGesture {
                    showWorkSheet = false
                }
            }
        }
        .sheet(isPresented: $showScheduleSheet) {
            ScheduleSheetView()
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
    }
}

// MARK: - Work Card
struct WorkCard: View {
    let work: Work
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Circle()
                    .fill(Color(hex: work.colorHex))
                    .frame(width: 16, height: 16)
                    .shadow(color: Color(hex: work.colorHex).opacity(0.6), radius: 8)
                
                Text(work.name)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.primary)
                
                Spacer()
                
                Text(work.rateType == .hourly ? "Почасовая" : "Фиксированная")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.gray)
            }
            
            Divider()
                .opacity(0.3)
            
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Ставка")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.gray)
                    
                    if work.rateType == .hourly {
                        Text("\(work.hourlyRate, specifier: "%.0f") \(work.currency)/ч")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.primary)
                    } else {
                        Text("\(work.fixedRate, specifier: "%.0f") \(work.currency)/смена")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.primary)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Валюта")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.gray)
                    
                    Text(work.currency)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: work.colorHex))
                }
            }
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color(hex: work.colorHex).opacity(0.3), lineWidth: 2)
        )
    }
}

// MARK: - Hourly Work Sheet
struct HourlyWorkSheet: View {
    let work: Work
    @State private var hours: Double = 8
    @EnvironmentObject var appState: AppState
    
    var income: Double {
        hours * work.hourlyRate
    }
    
    var body: some View {
        VStack(spacing: 20) {
            VStack(spacing: 12) {
                Text("Часов отработано")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.gray)
                
                HStack(spacing: 12) {
                    Button(action: { hours = max(0, hours - 0.5) }) {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.blue)
                    }
                    
                    TextField("Часы", value: $hours, format: .number)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .multilineTextAlignment(.center)
                        .keyboardType(.decimalPad)
                        .frame(maxWidth: .infinity)
                    
                    Button(action: { hours += 0.5 }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.green)
                    }
                }
            }
            
            Divider()
                .opacity(0.3)
            
            VStack(spacing: 8) {
                HStack {
                    Text("Доход")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.gray)
                    
                    Spacer()
                    
                    Text("\(income, specifier: "%.2f") \(work.currency)")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.green)
                        .contentTransition(.numericText())
                }
            }
            
            Button(action: {
                appState.addShift(
                    workId: work.id,
                    date: Date(),
                    hours: hours,
                    isWeekend: false
                )
                hapticFeedback(.success)
            }) {
                Text("Добавить смену")
                    .font(.system(size: 16, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.blue.opacity(0.8),
                                Color.cyan.opacity(0.6)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .foregroundColor(.white)
                    .cornerRadius(16)
            }
        }
        .padding(.horizontal, 20)
    }
}

// MARK: - Fixed Work Sheet
struct FixedWorkSheet: View {
    let work: Work
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                Button(action: {
                    appState.addShift(
                        workId: work.id,
                        date: Date(),
                        hours: 0,
                        isWeekend: false
                    )
                    hapticFeedback(.success)
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Добавить смену")
                    }
                    .font(.system(size: 16, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(.ultraThinMaterial)
                    .foregroundColor(.blue)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.blue.opacity(0.3), lineWidth: 1)
                    )
                }
                
                Button(action: {
                    let calendar = Calendar.current
                    let isWeekend = calendar.isDateInWeekend(Date())
                    appState.addShift(
                        workId: work.id,
                        date: Date(),
                        hours: 0,
                        isWeekend: true
                    )
                    hapticFeedback(.success)
                }) {
                    HStack {
                        Image(systemName: "sun.max.fill")
                        Text("Выходной")
                    }
                    .font(.system(size: 16, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(.ultraThinMaterial)
                    .foregroundColor(.orange)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                    )
                }
            }
            
            Text("Ставка за смену: \(work.fixedRate, specifier: "%.0f") \(work.currency)")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.gray)
                .frame(maxWidth: .infinity, alignment: .center)
        }
        .padding(.horizontal, 20)
    }
}

// MARK: - Reports View
struct ReportsView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedYear = Calendar.current.component(.year, from: Date())
    
    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Year Selector
                    HStack(spacing: 12) {
                        Button(action: { selectedYear -= 1 }) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.blue)
                        }
                        
                        Text("\(selectedYear)")
                            .font(.system(size: 18, weight: .bold))
                            .frame(maxWidth: .infinity)
                        
                        Button(action: { selectedYear += 1 }) {
                            Image(systemName: "chevron.right")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    // Monthly Reports
                    VStack(spacing: 12) {
                        ForEach(1...12, id: \.self) { month in
                            MonthlyReportCard(month: month, year: selectedYear)
                                .transition(.asymmetric(
                                    insertion: .scale(scale: 0.8).combined(with: .opacity),
                                    removal: .scale(scale: 0.5)
                                ))
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    // Charts Section
                    ChartsSection(year: selectedYear)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 20)
                    
                    Spacer(minLength: 40)
                }
            }
            
            // Year Summary at Bottom
            VStack {
                Spacer()
                
                YearSummaryPanel(year: selectedYear)
            }
        }
    }
}

// MARK: - Monthly Report Card
struct MonthlyReportCard: View {
    let month: Int
    let year: Int
    @EnvironmentObject var appState: AppState
    
    var monthName: String {
        let formatter = DateFormatter()
        let date = Calendar.current.date(from: DateComponents(year: year, month: month))!
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "LLLL"
        return formatter.string(from: date).capitalized
    }
    
    var monthStats: (income: Double, shifts: Int, hours: Double, weekends: Int) {
        let calendar = Calendar.current
        let monthShifts = appState.shifts.filter { shift in
            let shiftMonth = calendar.component(.month, from: shift.date)
            let shiftYear = calendar.component(.year, from: shift.date)
            return shiftMonth == month && shiftYear == year
        }
        
        let income = monthShifts.reduce(0) { sum, shift in
            guard let work = appState.works.first(where: { $0.id == shift.workId }) else { return sum }
            
            if work.rateType == .hourly {
                return sum + (shift.hours * work.hourlyRate)
            } else {
                return sum + (shift.isWeekend ? 0 : work.fixedRate)
            }
        }
        
        let shifts = monthShifts.filter { !$0.isWeekend }.count
        let hours = monthShifts.reduce(0) { $0 + $1.hours }
        let weekends = monthShifts.filter { $0.isWeekend }.count
        
        return (income, shifts, hours, weekends)
    }
    
    var body: some View {
        let stats = monthStats
        
        VStack(spacing: 12) {
            Text(monthName)
                .font(.system(size: 16, weight: .bold))
                .frame(maxWidth: .infinity, alignment: .leading)
                .foregroundColor(.primary)
            
            Divider()
                .opacity(0.3)
            
            HStack(spacing: 12) {
                StatItem(
                    icon: "💰",
                    label: "Доход",
                    value: "\(stats.income, specifier: "%.0f") ₽"
                )
                
                Divider()
                    .frame(height: 40)
                
                StatItem(
                    icon: "📅",
                    label: "Смены",
                    value: "\(stats.shifts)"
                )
                
                Divider()
                    .frame(height: 40)
                
                StatItem(
                    icon: "⏱",
                    label: "Часов",
                    value: "\(stats.hours, specifier: "%.1f")ч"
                )
                
                Divider()
                    .frame(height: 40)
                
                StatItem(
                    icon: "🌴",
                    label: "Выходных",
                    value: "\(stats.weekends)"
                )
            }
            .frame(maxWidth: .infinity)
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
        .cornerRadius(20)
    }
}

// MARK: - Stat Item
struct StatItem: View {
    let icon: String
    let label: String
    let value: String
    
    var body: some View {
        VStack(spacing: 6) {
            Text(icon)
                .font(.system(size: 20))
            
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.gray)
            
            Text(value)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.primary)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Charts Section
struct ChartsSection: View {
    let year: Int
    @EnvironmentObject var appState: AppState
    
    var monthlyData: [Double] {
        (1...12).map { month in
            let calendar = Calendar.current
            let monthShifts = appState.shifts.filter { shift in
                let shiftMonth = calendar.component(.month, from: shift.date)
                let shiftYear = calendar.component(.year, from: shift.date)
                return shiftMonth == month && shiftYear == year
            }
            
            return monthShifts.reduce(0) { sum, shift in
                guard let work = appState.works.first(where: { $0.id == shift.workId }) else { return sum }
                
                if work.rateType == .hourly {
                    return sum + (shift.hours * work.hourlyRate)
                } else {
                    return sum + (shift.isWeekend ? 0 : work.fixedRate)
                }
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 16) {
            Text("График доходов по месяцам")
                .font(.system(size: 16, weight: .bold))
                .frame(maxWidth: .infinity, alignment: .leading)
            
            BarChartView(data: monthlyData)
                .frame(height: 200)
            
            HStack(spacing: 8) {
                let months = ["Янв", "Февр", "Март", "Апр", "Май", "Июнь", "Июль", "Авг", "Сент", "Окт", "Ноя", "Дек"]
                
                ForEach(months.indices, id: \.self) { index in
                    Text(months[index])
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.gray)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 8)
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
        .cornerRadius(20)
    }
}

// MARK: - Bar Chart View
struct BarChartView: View {
    let data: [Double]
    @State private var animatedData: [Double] = []
    
    var maxValue: Double {
        data.max() ?? 1
    }
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(data.indices, id: \.self) { index in
                VStack {
                    Spacer()
                    
                    RoundedRectangle(cornerRadius: 6)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [.cyan, .purple]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(height: CGFloat(animatedData[index] / maxValue * 100))
                        .shadow(color: Color.cyan.opacity(0.3), radius: 4)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .onAppear {
            for (index, value) in data.enumerated() {
                withAnimation(.easeOut(duration: 0.6).delay(Double(index) * 0.05)) {
                    animatedData[index] = value
                }
            }
        }
    }
}

// MARK: - Year Summary Panel
struct YearSummaryPanel: View {
    let year: Int
    @EnvironmentObject var appState: AppState
    
    var yearStats: (income: Double, shifts: Int, hours: Double, weekends: Int) {
        let calendar = Calendar.current
        let yearShifts = appState.shifts.filter { shift in
            calendar.component(.year, from: shift.date) == year
        }
        
        let income = yearShifts.reduce(0) { sum, shift in
            guard let work = appState.works.first(where: { $0.id == shift.workId }) else { return sum }
            
            if work.rateType == .hourly {
                return sum + (shift.hours * work.hourlyRate)
            } else {
                return sum + (shift.isWeekend ? 0 : work.fixedRate)
            }
        }
        
        let shifts = yearShifts.filter { !$0.isWeekend }.count
        let hours = yearShifts.reduce(0) { $0 + $1.hours }
        let weekends = yearShifts.filter { $0.isWeekend }.count
        
        return (income, shifts, hours, weekends)
    }
    
    var body: some View {
        let stats = yearStats
        
        VStack(spacing: 12) {
            Text("Итог за \(year)")
                .font(.system(size: 16, weight: .bold))
                .frame(maxWidth: .infinity, alignment: .leading)
            
            HStack(spacing: 12) {
                StatItem(
                    icon: "💰",
                    label: "Общий доход",
                    value: "\(stats.income, specifier: "%.0f") ₽"
                )
                
                Divider()
                    .frame(height: 40)
                
                StatItem(
                    icon: "📅",
                    label: "Всего смен",
                    value: "\(stats.shifts)"
                )
                
                Divider()
                    .frame(height: 40)
                
                StatItem(
                    icon: "⏱",
                    label: "Всего часов",
                    value: "\(stats.hours, specifier: "%.1f")ч"
                )
                
                Divider()
                    .frame(height: 40)
                
                StatItem(
                    icon: "🌴",
                    label: "Выходных",
                    value: "\(stats.weekends)"
                )
            }
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
        .cornerRadius(20)
        .padding(16)
    }
}

// MARK: - Settings View
struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @State private var showAddWork = false
    @State private var showEditWork: Work?
    
    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 20) {
                    HStack {
                        Text("Ваши работы")
                            .font(.system(size: 20, weight: .bold))
                        
                        Spacer()
                        
                        Button(action: { showAddWork = true }) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundColor(.blue)
                                .frame(width: 44, height: 44)
                                .background(
                                    Circle()
                                        .fill(.ultraThinMaterial)
                                        .overlay(
                                            Circle()
                                                .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                        )
                                )
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    if appState.works.isEmpty {
                        VStack(spacing: 16) {
                            Image(systemName: "plus.circle.dashed")
                                .font(.system(size: 48))
                                .foregroundColor(.gray.opacity(0.5))
                            
                            Text("Создайте вашу первую работу")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.gray)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 300)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(.ultraThinMaterial)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                        )
                        .padding(.horizontal, 20)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(appState.works, id: \.id) { work in
                                WorkSettingCard(work: work, onDelete: {
                                    withAnimation(.easeInOut(duration: 0.3)) {
                                        appState.deleteWork(id: work.id)
                                        hapticFeedback(.notification(.warning))
                                    }
                                })
                                .transition(.asymmetric(
                                    insertion: .scale(scale: 0.8).combined(with: .opacity),
                                    removal: .scale(scale: 0.5).combined(with: .opacity)
                                ))
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    Spacer(minLength: 40)
                }
            }
            
            if showAddWork {
                AddWorkSheetView(isPresented: $showAddWork)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
    }
}

// MARK: - Work Setting Card
struct WorkSettingCard: View {
    let work: Work
    let onDelete: () -> Void
    @State private var showDeleteConfirm = false
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Circle()
                    .fill(Color(hex: work.colorHex))
                    .frame(width: 20, height: 20)
                    .shadow(color: Color(hex: work.colorHex).opacity(0.6), radius: 8)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(work.name)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.primary)
                    
                    Text("\(work.rateType == .hourly ? "Почасовая" : "Фиксированная") - \(work.currency)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                Button(action: { showDeleteConfirm = true }) {
                    Image(systemName: "trash.fill")
                        .foregroundColor(.red)
                        .frame(width: 44, height: 44)
                }
            }
            .padding(12)
            .background(.ultraThinMaterial)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
            
            if work.rateType == .hourly {
                HStack(spacing: 8) {
                    Text("Ставка:")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.gray)
                    
                    Text("\(work.hourlyRate, specifier: "%.0f") \(work.currency)/ч")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color(hex: work.colorHex))
                }
                .padding(.horizontal, 12)
            } else {
                HStack(spacing: 8) {
                    Text("Ставка:")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.gray)
                    
                    Text("\(work.fixedRate, specifier: "%.0f") \(work.currency)/смена")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color(hex: work.colorHex))
                }
                .padding(.horizontal, 12)
            }
        }
        .alert("Удалить работу?", isPresented: $showDeleteConfirm) {
            Button("Отмена", role: .cancel) { }
            Button("Удалить", role: .destructive) {
                onDelete()
            }
        } message: {
            Text("Эта работа и все связанные смены будут удалены")
        }
    }
}

// MARK: - Add Work Sheet
struct AddWorkSheetView: View {
    @Binding var isPresented: Bool
    @EnvironmentObject var appState: AppState
    
    @State private var name = ""
    @State private var selectedColor = "FF6B6B"
    @State private var rateType: RateType = .hourly
    @State private var hourlyRate = ""
    @State private var fixedRate = ""
    @State private var selectedCurrency = "₽"
    
    let colors = [
        "FF6B6B", "4ECDC4", "45B7D1", "FFA07A", "98D8C8",
        "F7DC6F", "BB8FCE", "85C1E2", "F8B88B", "82E0AA",
        "F5B7B1", "AED6F1"
    ]
    
    let currencies = ["₽", "$", "€", "₸", "₴", "¥", "£"]
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture { isPresented = false }
            
            VStack(spacing: 20) {
                // Handle
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color.gray.opacity(0.4))
                    .frame(width: 40, height: 4)
                    .padding(.top, 8)
                
                Text("Создать работу")
                    .font(.system(size: 20, weight: .bold))
                
                ScrollView {
                    VStack(spacing: 16) {
                        // Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Название")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.gray)
                            
                            TextField("Напр., Водитель такси", text: $name)
                                .padding(12)
                                .background(.ultraThinMaterial)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )
                        }
                        
                        // Color Selection
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Цвет")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.gray)
                            
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 12) {
                                ForEach(colors, id: \.self) { color in
                                    Button(action: { selectedColor = color }) {
                                        Circle()
                                            .fill(Color(hex: color))
                                            .frame(height: 50)
                                            .overlay(
                                                Circle()
                                                    .stroke(selectedColor == color ? Color.white : Color.clear, lineWidth: 3)
                                            )
                                            .shadow(color: Color(hex: color).opacity(selectedColor == color ? 0.6 : 0.2), radius: 8)
                                            .scaleEffect(selectedColor == color ? 1.1 : 1.0)
                                    }
                                }
                            }
                        }
                        
                        // Rate Type
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Тип ставки")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.gray)
                            
                            Picker("Тип ставки", selection: $rateType) {
                                Text("Почасовая").tag(RateType.hourly)
                                Text("Фиксированная").tag(RateType.fixed)
                            }
                            .pickerStyle(.segmented)
                        }
                        
                        // Rate Input
                        VStack(alignment: .leading, spacing: 8) {
                            Text(rateType == .hourly ? "Часовая ставка" : "Ставка за смену")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.gray)
                            
                            TextField("0", text: rateType == .hourly ? $hourlyRate : $fixedRate)
                                .keyboardType(.decimalPad)
                                .padding(12)
                                .background(.ultraThinMaterial)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )
                        }
                        
                        // Currency
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Валюта")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.gray)
                            
                            Picker("Валюта", selection: $selectedCurrency) {
                                ForEach(currencies, id: \.self) { currency in
                                    Text(currency).tag(currency)
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                
                // Action Buttons
                HStack(spacing: 12) {
                    Button(action: { isPresented = false }) {
                        Text("Отмена")
                            .font(.system(size: 16, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(.ultraThinMaterial)
                            .foregroundColor(.blue)
                            .cornerRadius(12)
                    }
                    
                    Button(action: {
                        let rate = rateType == .hourly ? Double(hourlyRate) ?? 0 : Double(fixedRate) ?? 0
                        
                        let work = Work(
                            id: UUID(),
                            name: name,
                            colorHex: selectedColor,
                            rateType: rateType,
                            hourlyRate: rateType == .hourly ? rate : 0,
                            fixedRate: rateType == .fixed ? rate : 0,
                            currency: selectedCurrency
                        )
                        
                        appState.addWork(work)
                        isPresented = false
                        hapticFeedback(.success)
                    }) {
                        Text("Создать")
                            .font(.system(size: 16, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.blue.opacity(0.8),
                                        Color.cyan.opacity(0.6)
                                    ]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 600)
            .background(.ultraThinMaterial)
            .cornerRadius(28)
            .overlay(
                RoundedRectangle(cornerRadius: 28)
                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
            )
            .padding(.horizontal, 16)
            .padding(.bottom, 20)
        }
    }
}

// MARK: - Schedule Sheet View
struct ScheduleSheetView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss
    
    @State private var selectedWork: Work?
    @State private var selectedPreset: String = "2/2"
    @State private var customWorking = 2
    @State private var customResting = 2
    @State private var startDate = Date()
    @State private var fillOption: String = "month"
    @State private var hoursPerShift = "8"
    @State private var isCustom = false
    
    let presets = ["2/2", "3/3", "4/3", "5/2"]
    
    var body: some View {
        VStack(spacing: 20) {
            // Handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.4))
                .frame(width: 40, height: 4)
                .padding(.top, 8)
            
            Text("Заполнить график")
                .font(.system(size: 20, weight: .bold))
            
            ScrollView {
                VStack(spacing: 20) {
                    // Work Selection
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Место работы")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.gray)
                        
                        Picker("Работа", selection: $selectedWork) {
                            ForEach(appState.works, id: \.id) { work in
                                HStack {
                                    Circle()
                                        .fill(Color(hex: work.colorHex))
                                        .frame(width: 12, height: 12)
                                    Text(work.name)
                                }.tag(Optional(work))
                            }
                        }
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    
                    // Preset Selection
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Схема смен")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.gray)
                        
                        HStack(spacing: 8) {
                            ForEach(presets, id: \.self) { preset in
                                Button(action: {
                                    selectedPreset = preset
                                    isCustom = false
                                }) {
                                    Text(preset)
                                        .font(.system(size: 14, weight: .semibold))
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 44)
                                        .background(selectedPreset == preset && !isCustom ? .blue : .ultraThinMaterial)
                                        .foregroundColor(selectedPreset == preset && !isCustom ? .white : .primary)
                                        .cornerRadius(12)
                                }
                            }
                        }
                        
                        Button(action: { isCustom = true }) {
                            Text("Свой вариант")
                                .font(.system(size: 14, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                                .background(isCustom ? .blue : .ultraThinMaterial)
                                .foregroundColor(isCustom ? .white : .primary)
                                .cornerRadius(12)
                        }
                    }
                    
                    // Custom Options
                    if isCustom {
                        VStack(spacing: 16) {
                            HStack {
                                Text("Смен подряд:")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.gray)
                                
                                Spacer()
                                
                                Stepper(value: $customWorking, in: 1...30) {
                                    Text("\(customWorking)")
                                        .font(.system(size: 14, weight: .bold))
                                }
                            }
                            
                            HStack {
                                Text("Выходных подряд:")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.gray)
                                
                                Spacer()
                                
                                Stepper(value: $customResting, in: 1...30) {
                                    Text("\(customResting)")
                                        .font(.system(size: 14, weight: .bold))
                                }
                            }
                        }
                        .padding(12)
                        .background(.ultraThinMaterial)
                        .cornerRadius(12)
                    }
                    
                    // Date Selection
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Начиная с даты")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.gray)
                        
                        DatePicker("", selection: $startDate, displayedComponents: .date)
                            .datePickerStyle(.compact)
                    }
                    
                    // Fill Option
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Заполнить до")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.gray)
                        
                        Picker("", selection: $fillOption) {
                            Text("Конца месяца").tag("month")
                            Text("Конца недели").tag("week")
                        }
                        .pickerStyle(.segmented)
                    }
                    
                    // Hours
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Часов за смену")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.gray)
                        
                        TextField("8", text: $hoursPerShift)
                            .keyboardType(.decimalPad)
                            .padding(12)
                            .background(.ultraThinMaterial)
                            .cornerRadius(12)
                    }
                }
                .padding(.horizontal, 20)
            }
            
            // Action Button
            Button(action: {
                if let work = selectedWork {
                    appState.fillSchedule(
                        workId: work.id,
                        startDate: startDate,
                        workingDays: isCustom ? customWorking : Int(selectedPreset.split(separator: "/")[0]) ?? 2,
                        restDays: isCustom ? customResting : Int(selectedPreset.split(separator: "/")[1]) ?? 2,
                        hours: Double(hoursPerShift) ?? 8,
                        fillOption: fillOption
                    )
                    dismiss()
                    hapticFeedback(.success)
                }
            }) {
                Text("Применить")
                    .font(.system(size: 16, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.blue.opacity(0.8),
                                Color.cyan.opacity(0.6)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .foregroundColor(.white)
                    .cornerRadius(16)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .cornerRadius(28)
    }
}

// MARK: - App State
class AppState: ObservableObject {
    @Published var works: [Work] = []
    @Published var shifts: [Shift] = []
    
    init() {
        loadData()
    }
    
    func addWork(_ work: Work) {
        works.append(work)
        saveData()
    }
    
    func deleteWork(id: UUID) {
        works.removeAll { $0.id == id }
        shifts.removeAll { $0.workId == id }
        saveData()
    }
    
    func addShift(workId: UUID, date: Date, hours: Double, isWeekend: Bool) {
        let shift = Shift(id: UUID(), workId: workId, date: date, hours: hours, isWeekend: isWeekend)
        shifts.append(shift)
        saveData()
    }
    
    func deleteShift(id: UUID) {
        shifts.removeAll { $0.id == id }
        saveData()
    }
    
    func fillSchedule(
        workId: UUID,
        startDate: Date,
        workingDays: Int,
        restDays: Int,
        hours: Double,
        fillOption: String
    ) {
        let calendar = Calendar.current
        var currentDate = calendar.startOfDay(for: startDate)
        var dayCounter = 0
        var isWorkingPeriod = true
        
        let endDate: Date
        if fillOption == "month" {
            let range = calendar.range(of: .day, in: .month, for: startDate)!
            let numDays = range.count
            let lastDate = calendar.date(byAdding: .day, value: numDays - 1, to: calendar.startOfDay(for: startDate))!
            endDate = lastDate
        } else {
            let nextSunday = calendar.nextDate(after: startDate, matching: DateComponents(weekday: 1), matchingPolicy: .nextTime)!
            endDate = nextSunday
        }
        
        while currentDate <= endDate {
            let isWeekend = calendar.isDateInWeekend(currentDate)
            
            if isWorkingPeriod && dayCounter < workingDays {
                addShift(workId: workId, date: currentDate, hours: isWeekend ? 0 : hours, isWeekend: false)
                dayCounter += 1
            } else if !isWorkingPeriod && dayCounter < restDays {
                if isWeekend {
                    addShift(workId: workId, date: currentDate, hours: 0, isWeekend: true)
                }
                dayCounter += 1
            } else {
                isWorkingPeriod.toggle()
                dayCounter = 0
            }
            
            currentDate = calendar.date(byAdding: .day, value: 1, to: currentDate)!
        }
    }
    
    private func saveData() {
        let encoder = JSONEncoder()
        
        if let worksData = try? encoder.encode(works) {
            UserDefaults.standard.set(worksData, forKey: "works")
        }
        
        if let shiftsData = try? encoder.encode(shifts) {
            UserDefaults.standard.set(shiftsData, forKey: "shifts")
        }
    }
    
    private func loadData() {
        let decoder = JSONDecoder()
        
        if let worksData = UserDefaults.standard.data(forKey: "works"),
           let decodedWorks = try? decoder.decode([Work].self, from: worksData) {
            works = decodedWorks
        }
        
        if let shiftsData = UserDefaults.standard.data(forKey: "shifts"),
           let decodedShifts = try? decoder.decode([Shift].self, from: shiftsData) {
            shifts = decodedShifts
        }
    }
}

// MARK: - Theme Manager
class ThemeManager: ObservableObject {
    @Published var isDarkMode: Bool
    
    init(isDarkMode: Bool = false) {
        self.isDarkMode = isDarkMode
    }
}

// MARK: - Models
struct Work: Codable, Identifiable {
    let id: UUID
    let name: String
    let colorHex: String
    let rateType: RateType
    let hourlyRate: Double
    let fixedRate: Double
    let currency: String
}

struct Shift: Codable, Identifiable {
    let id: UUID
    let workId: UUID
    let date: Date
    let hours: Double
    let isWeekend: Bool
}

enum RateType: String, Codable {
    case hourly = "hourly"
    case fixed = "fixed"
}

// MARK: - Extensions
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var rgbValue: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&rgbValue)
        
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        
        self.init(red: r, green: g, blue: b)
    }
}

func hapticFeedback(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
    let generator = UIImpactFeedbackGenerator(style: style)
    generator.impactOccurred()
}

func hapticFeedback(_ style: UINotificationFeedbackGenerator.FeedbackType) {
    let generator = UINotificationFeedbackGenerator()
    generator.notificationOccurred(style)
}
