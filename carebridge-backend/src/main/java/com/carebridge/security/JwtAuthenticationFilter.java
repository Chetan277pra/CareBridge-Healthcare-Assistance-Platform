package com.carebridge.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        // ✅ 1. Skip auth endpoints
        String path = request.getServletPath();

        // ✅ skip ALL public endpoints safely
        if (path.startsWith("/api/auth") || path.equals("/error")) {
            filterChain.doFilter(request, response);
            return;
        }

        // ✅ 2. Get Authorization header
        final String authHeader = request.getHeader("Authorization");

        String jwt = null;
        String userEmail = null;

        // ✅ 3. Validate header format
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;   // 🔥 IMPORTANT (prevents 403 crash cases)
        }

        // ✅ 4. Extract token safely
        try {
            jwt = authHeader.substring(7);
            userEmail = jwtUtil.extractUsername(jwt);
        } catch (Exception e) {
            filterChain.doFilter(request, response);
            return;   // 🔥 invalid token → skip
        }
        System.out.println("=== JWT FILTER ===");
        System.out.println("Header: " + authHeader);
        System.out.println("Token: " + jwt);
        System.out.println("Email: " + userEmail);
        // ✅ 5. Authenticate user
        if (userEmail != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {

            UserDetails userDetails =
                    userDetailsService.loadUserByUsername(userEmail);

            if (jwtUtil.validateToken(jwt, userDetails.getUsername())) {

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                authToken.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );

                SecurityContextHolder.getContext()
                        .setAuthentication(authToken);
            }
        }

        // ✅ 6. Continue request
        filterChain.doFilter(request, response);
    }
}