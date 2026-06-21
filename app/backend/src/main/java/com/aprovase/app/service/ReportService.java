package com.aprovase.app.service;

import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.StudySession;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.StudySessionRepository;
import com.aprovase.app.repository.SubjectRepository;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ReportService {

    private final StudySessionRepository sessionRepository;
    private final SubjectRepository subjectRepository;

    public ReportService(StudySessionRepository sessionRepository, SubjectRepository subjectRepository) {
        this.sessionRepository = sessionRepository;
        this.subjectRepository = subjectRepository;
    }

    public byte[] generateWeeklyReport(User user) throws DocumentException {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime weekAgo = now.minusDays(7);

        List<Subject> subjects = subjectRepository.findAllByUserOrderByPriorityDescWeeklyHoursDesc(user);
        List<StudySession> sessions = sessionRepository.findByUserAndStartedAtBetweenOrderByStartedAtDesc(user, weekAgo, now);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 50, 50);
        PdfWriter.getInstance(doc, out);
        doc.open();

        Font titleFont = new Font(Font.HELVETICA, 22, Font.BOLD, new Color(124, 58, 237));
        Font subtitleFont = new Font(Font.HELVETICA, 11, Font.NORMAL, new Color(100, 116, 139));
        Font sectionFont = new Font(Font.HELVETICA, 14, Font.BOLD, new Color(30, 41, 59));
        Font headerFont = new Font(Font.HELVETICA, 9, Font.BOLD, new Color(100, 116, 139));
        Font cellFont = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(30, 41, 59));
        Font boldCell = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(30, 41, 59));

        Paragraph title = new Paragraph("aprova.se", titleFont);
        title.setAlignment(Element.ALIGN_LEFT);
        doc.add(title);

        String dateRange = weekAgo.format(DateTimeFormatter.ofPattern("dd/MM")) + " a " + now.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        Paragraph sub = new Paragraph("Relatório Semanal — " + dateRange, subtitleFont);
        sub.setSpacingAfter(6);
        doc.add(sub);

        Paragraph userName = new Paragraph(user.getName(), new Font(Font.HELVETICA, 12, Font.NORMAL, new Color(71, 85, 105)));
        userName.setSpacingAfter(20);
        doc.add(userName);

        int totalMinutes = sessions.stream().mapToInt(s -> s.getDuration() != null ? s.getDuration() : 0).sum();
        int totalCorrect = sessions.stream().mapToInt(s -> s.getCorrectAnswers() != null ? s.getCorrectAnswers() : 0).sum();
        int totalWrong = sessions.stream().mapToInt(s -> s.getWrongAnswers() != null ? s.getWrongAnswers() : 0).sum();
        int totalQuestions = totalCorrect + totalWrong;

        Paragraph summaryTitle = new Paragraph("Resumo", sectionFont);
        summaryTitle.setSpacingAfter(8);
        doc.add(summaryTitle);

        PdfPTable summaryTable = new PdfPTable(4);
        summaryTable.setWidthPercentage(100);
        summaryTable.setSpacingAfter(20);
        addSummaryCell(summaryTable, "Tempo Total", formatHours(totalMinutes), headerFont, boldCell);
        addSummaryCell(summaryTable, "Sessões", String.valueOf(sessions.size()), headerFont, boldCell);
        addSummaryCell(summaryTable, "Questões", String.valueOf(totalQuestions), headerFont, boldCell);
        addSummaryCell(summaryTable, "Aproveitamento", totalQuestions > 0 ? Math.round((double) totalCorrect / totalQuestions * 100) + "%" : "-", headerFont, boldCell);

        doc.add(summaryTable);

        Paragraph bySubjectTitle = new Paragraph("Por Disciplina", sectionFont);
        bySubjectTitle.setSpacingAfter(8);
        doc.add(bySubjectTitle);

        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3, 1.2f, 1, 1, 1});

        String[] headers = {"Disciplina", "Tempo", "Acertos", "Erros", "%"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBorderWidth(0);
            cell.setBorderWidthBottom(1);
            cell.setBorderColor(new Color(226, 232, 240));
            cell.setPadding(8);
            cell.setBackgroundColor(new Color(248, 250, 252));
            table.addCell(cell);
        }

        Map<Long, int[]> bySubject = new LinkedHashMap<>();
        for (StudySession s : sessions) {
            if (s.getSubject() == null) continue;
            Long sid = s.getSubject().getId();
            int[] data = bySubject.computeIfAbsent(sid, k -> new int[3]);
            data[0] += s.getDuration() != null ? s.getDuration() : 0;
            data[1] += s.getCorrectAnswers() != null ? s.getCorrectAnswers() : 0;
            data[2] += s.getWrongAnswers() != null ? s.getWrongAnswers() : 0;
        }

        for (Subject subj : subjects) {
            int[] data = bySubject.getOrDefault(subj.getId(), new int[3]);
            if (data[0] == 0 && data[1] == 0 && data[2] == 0) continue;
            int total = data[1] + data[2];
            String pct = total > 0 ? Math.round((double) data[1] / total * 100) + "%" : "-";

            addTableCell(table, subj.getName(), boldCell);
            addTableCell(table, formatHours(data[0]), cellFont);
            addTableCell(table, String.valueOf(data[1]), cellFont);
            addTableCell(table, String.valueOf(data[2]), cellFont);
            addTableCell(table, pct, cellFont);
        }

        doc.add(table);

        Paragraph footer = new Paragraph("\nGerado por aprova.se em " + now.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")),
                new Font(Font.HELVETICA, 8, Font.ITALIC, new Color(148, 163, 184)));
        footer.setAlignment(Element.ALIGN_CENTER);
        doc.add(footer);

        doc.close();
        return out.toByteArray();
    }

    private void addSummaryCell(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderWidth(0);
        cell.setPadding(10);
        cell.setBackgroundColor(new Color(248, 250, 252));
        cell.addElement(new Phrase(label, labelFont));
        Paragraph v = new Paragraph(value, valueFont);
        v.setSpacingBefore(2);
        cell.addElement(v);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorderWidth(0);
        cell.setBorderWidthBottom(0.5f);
        cell.setBorderColor(new Color(241, 245, 249));
        cell.setPadding(8);
        table.addCell(cell);
    }

    private String formatHours(int minutes) {
        if (minutes == 0) return "0h";
        int h = minutes / 60;
        int m = minutes % 60;
        if (h == 0) return m + "min";
        return m > 0 ? h + "h " + m + "min" : h + "h";
    }
}
